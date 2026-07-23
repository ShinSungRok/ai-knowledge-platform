import { asExperimentRunId, type ExperimentRunId } from "./ExperimentRunId";
import {
  asLlmopsObservationId,
  type LlmopsObservationId,
} from "./LlmopsObservationId";
import type { LlmopsObservationRecord } from "./LlmopsObservationRecord";
import type {
  LlmopsObservationRecordInput,
  LlmopsObservationStore,
} from "./LlmopsObservationStore";
import { asServingConfigId, type ServingConfigId } from "./ServingConfigId";

/**
 * In-memory {@link LlmopsObservationStore}: workspace-scoped quality /
 * cost / latency observations with defensive copies and isolation.
 *
 * Does **not** import or call `app/knowledge/observability`. Soft-link
 * ids only — no ExperimentRunStore / ServingConfigStore calls.
 */
export class InMemoryLlmopsObservationStore implements LlmopsObservationStore {
  private readonly observationsByWorkspace = new Map<
    string,
    Map<string, LlmopsObservationRecord>
  >();

  async record(
    input: LlmopsObservationRecordInput,
  ): Promise<LlmopsObservationRecord> {
    const validated = this.toRecordInput(input);
    const observations = this.getOrCreateWorkspace(validated.workspaceId);
    if (observations.has(validated.id)) {
      throw new Error(`Duplicate observation id: ${validated.id}`);
    }
    const record: LlmopsObservationRecord = {
      id: validated.id,
      workspaceId: validated.workspaceId,
      recordedAtUnixMs: validated.recordedAtUnixMs,
    };
    if (validated.experimentRunId !== undefined) {
      record.experimentRunId = validated.experimentRunId;
    }
    if (validated.servingConfigId !== undefined) {
      record.servingConfigId = validated.servingConfigId;
    }
    if (validated.quality !== undefined) {
      record.quality = { ...validated.quality };
    }
    if (validated.costUnits !== undefined) {
      record.costUnits = validated.costUnits;
    }
    if (validated.latencyMs !== undefined) {
      record.latencyMs = validated.latencyMs;
    }
    if (validated.attributes !== undefined) {
      record.attributes = { ...validated.attributes };
    }
    observations.set(record.id, this.clone(record));
    return this.clone(record);
  }

  async getById(
    workspaceId: string,
    id: LlmopsObservationId,
  ): Promise<LlmopsObservationRecord | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const observationId = asLlmopsObservationId(id);
    const stored = this.observationsByWorkspace
      .get(workspaceId)
      ?.get(observationId);
    return stored ? this.clone(stored) : null;
  }

  async listByWorkspace(
    workspaceId: string,
  ): Promise<readonly LlmopsObservationRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const observations = this.observationsByWorkspace.get(workspaceId);
    if (!observations || observations.size === 0) {
      return [];
    }
    return this.sortObservations(
      [...observations.values()].map((o) => this.clone(o)),
    );
  }

  async listByExperimentRun(
    workspaceId: string,
    experimentRunId: ExperimentRunId,
  ): Promise<readonly LlmopsObservationRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const runId = asExperimentRunId(experimentRunId);
    const observations = this.observationsByWorkspace.get(workspaceId);
    if (!observations || observations.size === 0) {
      return [];
    }
    return this.sortObservations(
      [...observations.values()]
        .filter((o) => o.experimentRunId === runId)
        .map((o) => this.clone(o)),
    );
  }

  async listByServingConfig(
    workspaceId: string,
    servingConfigId: ServingConfigId,
  ): Promise<readonly LlmopsObservationRecord[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const configId = asServingConfigId(servingConfigId);
    const observations = this.observationsByWorkspace.get(workspaceId);
    if (!observations || observations.size === 0) {
      return [];
    }
    return this.sortObservations(
      [...observations.values()]
        .filter((o) => o.servingConfigId === configId)
        .map((o) => this.clone(o)),
    );
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, LlmopsObservationRecord> {
    let map = this.observationsByWorkspace.get(workspaceId);
    if (!map) {
      map = new Map();
      this.observationsByWorkspace.set(workspaceId, map);
    }
    return map;
  }

  private toRecordInput(
    input: LlmopsObservationRecordInput,
  ): LlmopsObservationRecordInput {
    if (!input || typeof input !== "object") {
      throw new Error("LlmopsObservationRecordInput must be an object");
    }
    this.assertNonEmptyString(input.workspaceId, "workspaceId");
    if (
      typeof input.recordedAtUnixMs !== "number" ||
      !Number.isFinite(input.recordedAtUnixMs)
    ) {
      throw new Error("recordedAtUnixMs must be a finite number");
    }

    let quality: Record<string, number> | undefined;
    if (input.quality !== undefined) {
      if (!input.quality || typeof input.quality !== "object") {
        throw new Error("quality must be an object");
      }
      quality = {};
      for (const [key, value] of Object.entries(input.quality)) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`quality.${key} must be a finite number`);
        }
        quality[key] = value;
      }
    }

    if (input.costUnits !== undefined) {
      if (
        typeof input.costUnits !== "number" ||
        !Number.isFinite(input.costUnits) ||
        input.costUnits < 0
      ) {
        throw new Error("costUnits must be a non-negative finite number");
      }
    }
    if (input.latencyMs !== undefined) {
      if (
        typeof input.latencyMs !== "number" ||
        !Number.isFinite(input.latencyMs) ||
        input.latencyMs < 0
      ) {
        throw new Error("latencyMs must be a non-negative finite number");
      }
    }

    const hasQuality = quality !== undefined && Object.keys(quality).length > 0;
    const hasCost = input.costUnits !== undefined;
    const hasLatency = input.latencyMs !== undefined;
    if (!hasQuality && !hasCost && !hasLatency) {
      throw new Error(
        "At least one of non-empty quality, costUnits, or latencyMs is required",
      );
    }

    const result: LlmopsObservationRecordInput = {
      id: asLlmopsObservationId(input.id),
      workspaceId: input.workspaceId,
      recordedAtUnixMs: input.recordedAtUnixMs,
    };
    if (input.experimentRunId !== undefined) {
      result.experimentRunId = asExperimentRunId(input.experimentRunId);
    }
    if (input.servingConfigId !== undefined) {
      result.servingConfigId = asServingConfigId(input.servingConfigId);
    }
    if (hasQuality) {
      result.quality = quality;
    }
    if (hasCost) {
      result.costUnits = input.costUnits;
    }
    if (hasLatency) {
      result.latencyMs = input.latencyMs;
    }
    if (input.attributes !== undefined) {
      result.attributes = this.copyStringMap(input.attributes);
    }
    return result;
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
        throw new Error(`attributes.${key} must be a string`);
      }
      copied[key] = value;
    }
    return copied;
  }

  private sortObservations(
    observations: LlmopsObservationRecord[],
  ): LlmopsObservationRecord[] {
    return observations.sort((a, b) => {
      if (a.recordedAtUnixMs !== b.recordedAtUnixMs) {
        return a.recordedAtUnixMs - b.recordedAtUnixMs;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  private clone(record: LlmopsObservationRecord): LlmopsObservationRecord {
    const cloned: LlmopsObservationRecord = {
      id: record.id,
      workspaceId: record.workspaceId,
      recordedAtUnixMs: record.recordedAtUnixMs,
    };
    if (record.experimentRunId !== undefined) {
      cloned.experimentRunId = record.experimentRunId;
    }
    if (record.servingConfigId !== undefined) {
      cloned.servingConfigId = record.servingConfigId;
    }
    if (record.quality !== undefined) {
      cloned.quality = { ...record.quality };
    }
    if (record.costUnits !== undefined) {
      cloned.costUnits = record.costUnits;
    }
    if (record.latencyMs !== undefined) {
      cloned.latencyMs = record.latencyMs;
    }
    if (record.attributes !== undefined) {
      cloned.attributes = { ...record.attributes };
    }
    return cloned;
  }
}

export { InMemoryLlmopsObservationStore as DefaultLlmopsObservationStore };
