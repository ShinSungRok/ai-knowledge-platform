import type { EvaluationGateDefinition } from "./EvaluationGateDefinition";
import { asEvaluationGateId, type EvaluationGateId } from "./EvaluationGateId";
import type {
  EvaluationGateDefinitionRegisterInput,
  EvaluationGateDefinitionStore,
} from "./EvaluationGateDefinitionStore";
import type { EvaluationGateRule } from "./EvaluationGateRule";

/**
 * In-memory {@link EvaluationGateDefinitionStore}: workspace-scoped named
 * gate definitions, defensive clone on every read/write, duplicate-id
 * rejection.
 */
export class InMemoryEvaluationGateDefinitionStore
  implements EvaluationGateDefinitionStore
{
  private readonly definitionsByWorkspace = new Map<
    string,
    Map<string, EvaluationGateDefinition>
  >();

  async register(
    input: EvaluationGateDefinitionRegisterInput,
  ): Promise<EvaluationGateDefinition> {
    const validated = this.toRegisterInput(input);
    const definitions = this.getOrCreateWorkspace(validated.workspaceId);
    if (definitions.has(validated.id)) {
      throw new Error(`Duplicate evaluation gate id: ${validated.id}`);
    }
    const record: EvaluationGateDefinition = {
      id: asEvaluationGateId(validated.id),
      workspaceId: validated.workspaceId,
      name: validated.name,
      rules: this.cloneRules(validated.rules),
    };
    definitions.set(validated.id, this.clone(record));
    return this.clone(record);
  }

  async getById(
    workspaceId: string,
    id: EvaluationGateId,
  ): Promise<EvaluationGateDefinition | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const gateId = asEvaluationGateId(id);
    const stored = this.definitionsByWorkspace.get(workspaceId)?.get(gateId);
    return stored ? this.clone(stored) : null;
  }

  async listByWorkspace(
    workspaceId: string,
  ): Promise<readonly EvaluationGateDefinition[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const definitions = this.definitionsByWorkspace.get(workspaceId);
    if (!definitions || definitions.size === 0) {
      return [];
    }
    return [...definitions.values()]
      .map((d) => this.clone(d))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, EvaluationGateDefinition> {
    let map = this.definitionsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.definitionsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private toRegisterInput(
    input: EvaluationGateDefinitionRegisterInput,
  ): EvaluationGateDefinitionRegisterInput {
    if (!input || typeof input !== "object") {
      throw new Error("EvaluationGateDefinitionRegisterInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    this.assertNonEmptyString(input.name, "name");
    if (!Array.isArray(input.rules) || input.rules.length === 0) {
      throw new Error("rules must be a non-empty array");
    }
    for (const rule of input.rules) {
      this.assertValidRule(rule);
    }
    return {
      id: asEvaluationGateId(input.id),
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      rules: input.rules,
    };
  }

  private assertValidRule(rule: EvaluationGateRule): void {
    if (!rule || typeof rule !== "object") {
      throw new Error("EvaluationGateRule must be an object");
    }
    this.assertNonEmptyString(rule.metricKey, "rule.metricKey");
    if (!["gte", "lte", "eq"].includes(rule.comparator)) {
      throw new Error('rule.comparator must be "gte" | "lte" | "eq"');
    }
    if (typeof rule.threshold !== "number" || !Number.isFinite(rule.threshold)) {
      throw new Error("rule.threshold must be a finite number");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} must be a non-empty string`);
    }
  }

  private cloneRules(
    rules: readonly EvaluationGateRule[],
  ): readonly EvaluationGateRule[] {
    return rules.map((rule) => ({ ...rule }));
  }

  private clone(
    definition: EvaluationGateDefinition,
  ): EvaluationGateDefinition {
    return {
      id: definition.id,
      workspaceId: definition.workspaceId,
      name: definition.name,
      rules: this.cloneRules(definition.rules),
    };
  }
}

export { InMemoryEvaluationGateDefinitionStore as DefaultEvaluationGateDefinitionStore };
