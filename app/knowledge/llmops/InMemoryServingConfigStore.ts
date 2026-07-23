import { asEvaluationGateId } from "./EvaluationGateId";
import { asModelVersionId } from "./ModelVersionId";
import { asPromptVersionId } from "./PromptVersionId";
import { asServingConfigId, type ServingConfigId } from "./ServingConfigId";
import type { ServingConfigStatus } from "./ServingConfigStatus";
import type { ServingConfigurationRecord } from "./ServingConfigurationRecord";
import type { ServingEnvironment } from "./ServingEnvironment";
import type {
  ServingConfigActivateInput,
  ServingConfigRegisterInput,
  ServingConfigRetireInput,
  ServingConfigStore,
} from "./ServingConfigStore";

const VALID_ENVIRONMENTS: readonly ServingEnvironment[] = [
  "dev",
  "staging",
  "production",
];

const VALID_STATUSES: readonly ServingConfigStatus[] = [
  "draft",
  "active",
  "retired",
];

/**
 * In-memory {@link ServingConfigStore}: workspace-scoped serving configs
 * with exactly one `active` per (workspaceId, environment) after activate.
 *
 * Soft-link ids only — does not call PromptRegistry, ModelRegistry, or
 * EvaluationGateEvaluator. No SQL/HTTP.
 */
export class InMemoryServingConfigStore implements ServingConfigStore {
  private readonly configsByWorkspace = new Map<
    string,
    Map<string, ServingConfigurationRecord>
  >();

  async register(
    input: ServingConfigRegisterInput,
  ): Promise<ServingConfigurationRecord> {
    const validated = this.toRegisterInput(input);
    const configs = this.getOrCreateWorkspace(validated.workspaceId);
    if (configs.has(validated.id)) {
      throw new Error(`Duplicate serving config id: ${validated.id}`);
    }
    const status = validated.status ?? "draft";
    if (status === "retired") {
      throw new Error("Cannot register serving config with status retired");
    }
    const record: ServingConfigurationRecord = {
      id: validated.id,
      workspaceId: validated.workspaceId,
      name: validated.name,
      environment: validated.environment,
      status,
      promptVersionId: validated.promptVersionId,
      modelVersionId: validated.modelVersionId,
    };
    if (validated.gateId !== undefined) {
      record.gateId = validated.gateId;
    }
    if (validated.trafficPercent !== undefined) {
      record.trafficPercent = validated.trafficPercent;
    }
    if (validated.metadata !== undefined) {
      record.metadata = { ...validated.metadata };
    }
    if (validated.activatedAtUnixMs !== undefined) {
      record.activatedAtUnixMs = validated.activatedAtUnixMs;
    }
    if (validated.retiredAtUnixMs !== undefined) {
      record.retiredAtUnixMs = validated.retiredAtUnixMs;
    }
    configs.set(record.id, this.clone(record));
    return this.clone(record);
  }

  async getById(
    workspaceId: string,
    id: ServingConfigId,
  ): Promise<ServingConfigurationRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const configId = asServingConfigId(id);
    const stored = this.configsByWorkspace.get(workspaceId)?.get(configId);
    return stored ? this.clone(stored) : null;
  }

  async listByWorkspace(
    workspaceId: string,
  ): Promise<readonly ServingConfigurationRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const configs = this.configsByWorkspace.get(workspaceId);
    if (!configs || configs.size === 0) {
      return [];
    }
    return this.sortConfigs([...configs.values()].map((c) => this.clone(c)));
  }

  async listByEnvironment(
    workspaceId: string,
    environment: ServingEnvironment,
  ): Promise<readonly ServingConfigurationRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertValidEnvironment(environment);
    const configs = this.configsByWorkspace.get(workspaceId);
    if (!configs || configs.size === 0) {
      return [];
    }
    return this.sortConfigs(
      [...configs.values()]
        .filter((c) => c.environment === environment)
        .map((c) => this.clone(c)),
    );
  }

  async activate(
    input: ServingConfigActivateInput,
  ): Promise<ServingConfigurationRecord> {
    if (!input || typeof input !== "object") {
      throw new Error("ServingConfigActivateInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    const id = asServingConfigId(input.id);
    const configs = this.configsByWorkspace.get(input.workspaceId);
    const existing = configs?.get(id);
    if (!existing) {
      throw new Error(`Unknown serving config id: ${id}`);
    }
    if (existing.status === "retired") {
      throw new Error(`Cannot activate retired serving config: ${id}`);
    }
    if (existing.status === "active") {
      const updated: ServingConfigurationRecord = this.clone(existing);
      if (input.activatedAtUnixMs !== undefined) {
        updated.activatedAtUnixMs = input.activatedAtUnixMs;
      }
      configs!.set(id, this.clone(updated));
      return this.clone(updated);
    }
    // draft → active; retire other actives in same workspace+environment
    for (const [otherId, other] of configs!) {
      if (
        otherId !== id &&
        other.environment === existing.environment &&
        other.status === "active"
      ) {
        const retired: ServingConfigurationRecord = {
          ...this.clone(other),
          status: "retired",
          retiredAtUnixMs: input.activatedAtUnixMs ?? Date.now(),
        };
        configs!.set(otherId, this.clone(retired));
      }
    }
    const activated: ServingConfigurationRecord = {
      id: existing.id,
      workspaceId: existing.workspaceId,
      name: existing.name,
      environment: existing.environment,
      status: "active",
      promptVersionId: existing.promptVersionId,
      modelVersionId: existing.modelVersionId,
    };
    if (existing.gateId !== undefined) {
      activated.gateId = existing.gateId;
    }
    if (existing.trafficPercent !== undefined) {
      activated.trafficPercent = existing.trafficPercent;
    }
    if (existing.metadata !== undefined) {
      activated.metadata = { ...existing.metadata };
    }
    activated.activatedAtUnixMs = input.activatedAtUnixMs ?? Date.now();
    configs!.set(id, this.clone(activated));
    return this.clone(activated);
  }

  async retire(
    input: ServingConfigRetireInput,
  ): Promise<ServingConfigurationRecord> {
    if (!input || typeof input !== "object") {
      throw new Error("ServingConfigRetireInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    const id = asServingConfigId(input.id);
    const configs = this.configsByWorkspace.get(input.workspaceId);
    const existing = configs?.get(id);
    if (!existing) {
      throw new Error(`Unknown serving config id: ${id}`);
    }
    if (existing.status === "retired") {
      throw new Error(`Serving config already retired: ${id}`);
    }
    const retired: ServingConfigurationRecord = {
      ...this.clone(existing),
      status: "retired",
      retiredAtUnixMs: input.retiredAtUnixMs ?? Date.now(),
    };
    configs!.set(id, this.clone(retired));
    return this.clone(retired);
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, ServingConfigurationRecord> {
    let map = this.configsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.configsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private toRegisterInput(
    input: ServingConfigRegisterInput,
  ): ServingConfigRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("ServingConfigRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.name, "name");
    this.assertValidEnvironment(input.environment);
    if (input.status !== undefined) {
      this.assertValidStatus(input.status);
    }
    if (input.trafficPercent !== undefined) {
      this.assertTrafficPercent(input.trafficPercent);
    }
    const result: ServingConfigRegisterInput = {
      id: asServingConfigId(input.id),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      environment: input.environment,
      promptVersionId: asPromptVersionId(input.promptVersionId),
      modelVersionId: asModelVersionId(input.modelVersionId),
    };
    if (input.status !== undefined) {
      result.status = input.status;
    }
    if (input.gateId !== undefined) {
      result.gateId = asEvaluationGateId(input.gateId);
    }
    if (input.trafficPercent !== undefined) {
      result.trafficPercent = input.trafficPercent;
    }
    if (input.metadata !== undefined) {
      result.metadata = this.copyStringMap(input.metadata);
    }
    if (input.activatedAtUnixMs !== undefined) {
      result.activatedAtUnixMs = input.activatedAtUnixMs;
    }
    if (input.retiredAtUnixMs !== undefined) {
      result.retiredAtUnixMs = input.retiredAtUnixMs;
    }
    return result;
  }

  private assertValidEnvironment(
    environment: unknown,
  ): asserts environment is ServingEnvironment {
    if (
      typeof environment !== "string" ||
      !VALID_ENVIRONMENTS.includes(environment as ServingEnvironment)
    ) {
      throw new Error(
        'environment must be "dev" | "staging" | "production"',
      );
    }
  }

  private assertValidStatus(
    status: unknown,
  ): asserts status is ServingConfigStatus {
    if (
      typeof status !== "string" ||
      !VALID_STATUSES.includes(status as ServingConfigStatus)
    ) {
      throw new Error('status must be "draft" | "active" | "retired"');
    }
  }

  private assertTrafficPercent(value: number): void {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    ) {
      throw new Error("trafficPercent must be an integer from 0 to 100");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private copyStringMap(
    map: Readonly<Record<string, string>>,
  ): Record<string, string> {
    const copied: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (typeof value !== "string") {
        throw new Error(`metadata.${key} must be a string`);
      }
      copied[key] = value;
    }
    return copied;
  }

  private sortConfigs(
    configs: ServingConfigurationRecord[],
  ): ServingConfigurationRecord[] {
    return configs.sort((a, b) => {
      if (a.name !== b.name) {
        return a.name < b.name ? -1 : 1;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  private clone(
    record: ServingConfigurationRecord,
  ): ServingConfigurationRecord {
    const cloned: ServingConfigurationRecord = {
      id: record.id,
      workspaceId: record.workspaceId,
      name: record.name,
      environment: record.environment,
      status: record.status,
      promptVersionId: record.promptVersionId,
      modelVersionId: record.modelVersionId,
    };
    if (record.gateId !== undefined) {
      cloned.gateId = record.gateId;
    }
    if (record.trafficPercent !== undefined) {
      cloned.trafficPercent = record.trafficPercent;
    }
    if (record.metadata !== undefined) {
      cloned.metadata = { ...record.metadata };
    }
    if (record.activatedAtUnixMs !== undefined) {
      cloned.activatedAtUnixMs = record.activatedAtUnixMs;
    }
    if (record.retiredAtUnixMs !== undefined) {
      cloned.retiredAtUnixMs = record.retiredAtUnixMs;
    }
    return cloned;
  }
}

export { InMemoryServingConfigStore as DefaultServingConfigStore };
