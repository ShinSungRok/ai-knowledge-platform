import type { ExperimentRunId } from "./ExperimentRunId";
import type { LlmopsObservationId } from "./LlmopsObservationId";
import type { LlmopsObservationRecord } from "./LlmopsObservationRecord";
import type { ServingConfigId } from "./ServingConfigId";

/**
 * Input for recording one LLMOps observation. Caller supplies `id`.
 * At least one of non-empty `quality`, `costUnits`, or `latencyMs` required.
 */
export interface LlmopsObservationRecordInput {
  id: LlmopsObservationId;
  workspaceId: string;
  recordedAtUnixMs: number;
  experimentRunId?: ExperimentRunId;
  servingConfigId?: ServingConfigId;
  quality?: Readonly<Record<string, number>>;
  costUnits?: number;
  latencyMs?: number;
  attributes?: Readonly<Record<string, string>>;
}

/**
 * Port for workspace-scoped LLMOps Observability (quality / cost / latency).
 *
 * Soft-link ids only — no ExperimentRunStore / ServingConfigStore calls.
 * Does **not** import or call `app/knowledge/observability` Metrics/OTLP.
 * Soft-map names for later export: `llmops.quality.<key>`,
 * `llmops.cost.units`, `llmops.latency.ms`. No `@opentelemetry/*`.
 */
export interface LlmopsObservationStore {
  record(input: LlmopsObservationRecordInput): Promise<LlmopsObservationRecord>;
  getById(
    workspaceId: string,
    id: LlmopsObservationId,
  ): Promise<LlmopsObservationRecord | null>;
  listByWorkspace(
    workspaceId: string,
  ): Promise<readonly LlmopsObservationRecord[]>;
  listByExperimentRun(
    workspaceId: string,
    experimentRunId: ExperimentRunId,
  ): Promise<readonly LlmopsObservationRecord[]>;
  listByServingConfig(
    workspaceId: string,
    servingConfigId: ServingConfigId,
  ): Promise<readonly LlmopsObservationRecord[]>;
}
