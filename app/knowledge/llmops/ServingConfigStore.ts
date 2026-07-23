import type { EvaluationGateId } from "./EvaluationGateId";
import type { ModelVersionId } from "./ModelVersionId";
import type { PromptVersionId } from "./PromptVersionId";
import type { ServingConfigId } from "./ServingConfigId";
import type { ServingConfigStatus } from "./ServingConfigStatus";
import type { ServingConfigurationRecord } from "./ServingConfigurationRecord";
import type { ServingEnvironment } from "./ServingEnvironment";

/**
 * Input for registering one serving configuration. Caller supplies `id`.
 * Default status is `draft` when omitted. Status `retired` on register
 * is rejected by InMemory adapters.
 */
export interface ServingConfigRegisterInput {
  id: ServingConfigId;
  workspaceId: string;
  name: string;
  environment: ServingEnvironment;
  status?: ServingConfigStatus;
  promptVersionId: PromptVersionId;
  modelVersionId: ModelVersionId;
  gateId?: EvaluationGateId;
  trafficPercent?: number;
  metadata?: Readonly<Record<string, string>>;
  activatedAtUnixMs?: number;
  retiredAtUnixMs?: number;
}

/**
 * Input for activating a serving configuration.
 *
 * Semantics: target must be `draft` or already `active` (idempotent).
 * Sets target to `active`. Any other `active` config in the same
 * workspace + environment is retired (exactly one active per env).
 * Does **not** call EvaluationGateEvaluator or registries.
 */
export interface ServingConfigActivateInput {
  workspaceId: string;
  id: ServingConfigId;
  activatedAtUnixMs?: number;
}

/**
 * Input for retiring a serving configuration.
 */
export interface ServingConfigRetireInput {
  workspaceId: string;
  id: ServingConfigId;
  retiredAtUnixMs?: number;
}

/**
 * Port for workspace-scoped Deployment / Serving Configuration persistence.
 *
 * Soft-link ids only — no PromptRegistry / ModelRegistry / gate evaluation,
 * no HTTP deploy, no LanguageModelProvider binding. Observability deferred.
 */
export interface ServingConfigStore {
  register(
    input: ServingConfigRegisterInput,
  ): Promise<ServingConfigurationRecord>;
  getById(
    workspaceId: string,
    id: ServingConfigId,
  ): Promise<ServingConfigurationRecord | null>;
  listByWorkspace(
    workspaceId: string,
  ): Promise<readonly ServingConfigurationRecord[]>;
  listByEnvironment(
    workspaceId: string,
    environment: ServingEnvironment,
  ): Promise<readonly ServingConfigurationRecord[]>;
  activate(
    input: ServingConfigActivateInput,
  ): Promise<ServingConfigurationRecord>;
  retire(input: ServingConfigRetireInput): Promise<ServingConfigurationRecord>;
}
