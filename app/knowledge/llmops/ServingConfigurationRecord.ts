import type { EvaluationGateId } from "./EvaluationGateId";
import type { ModelVersionId } from "./ModelVersionId";
import type { PromptVersionId } from "./PromptVersionId";
import type { ServingConfigId } from "./ServingConfigId";
import type { ServingConfigStatus } from "./ServingConfigStatus";
import type { ServingEnvironment } from "./ServingEnvironment";

/**
 * Workspace-scoped serving / deployment configuration.
 *
 * Soft links only: `promptVersionId` / `modelVersionId` / `gateId` are
 * opaque ids — the store does **not** call PromptRegistry, ModelRegistry,
 * or EvaluationGateEvaluator. Does not bind LanguageModelProvider or HTTP.
 */
export interface ServingConfigurationRecord {
  id: ServingConfigId;
  workspaceId: string;
  name: string;
  environment: ServingEnvironment;
  status: ServingConfigStatus;
  promptVersionId: PromptVersionId;
  modelVersionId: ModelVersionId;
  gateId?: EvaluationGateId;
  trafficPercent?: number;
  metadata?: Readonly<Record<string, string>>;
  activatedAtUnixMs?: number;
  retiredAtUnixMs?: number;
}
