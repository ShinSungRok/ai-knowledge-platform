import type { ExperimentRunId } from "./ExperimentRunId";
import type { LlmopsObservationId } from "./LlmopsObservationId";
import type { ServingConfigId } from "./ServingConfigId";

/**
 * One workspace-scoped LLMOps observation: quality, cost, and/or latency.
 *
 * Soft links only: `experimentRunId` / `servingConfigId` are opaque — the
 * store does **not** call ExperimentRunStore or ServingConfigStore.
 *
 * Soft-map (document only — do not import `app/knowledge/observability`):
 * suggested metric names for later Metrics/OTLP export:
 * `llmops.quality.<key>`, `llmops.cost.units`, `llmops.latency.ms`.
 * This Sprint does not wire ExportingMetrics / OTLP exporters.
 *
 * Invariant: at least one of non-empty `quality`, `costUnits`, or
 * `latencyMs` must be present (enforced by adapters).
 */
export interface LlmopsObservationRecord {
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
