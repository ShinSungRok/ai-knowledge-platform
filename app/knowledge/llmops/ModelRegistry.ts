import type { ModelId } from "./ModelId";
import type { ModelRecord } from "./ModelRecord";
import type { ModelVersionId } from "./ModelVersionId";
import type { ModelVersionRecord } from "./ModelVersionRecord";

/**
 * Input for registering one model. Caller supplies `id`.
 */
export interface ModelRegisterInput {
  id: ModelId;
  workspaceId: string;
  name: string;
}

/**
 * Input for registering one model version. Caller supplies `id`.
 */
export interface ModelVersionRegisterInput {
  id: ModelVersionId;
  modelId: ModelId;
  workspaceId: string;
  version: string;
  providerModel: string;
  metadata?: Readonly<Record<string, string>>;
}

/**
 * Port for workspace-scoped Model / version registry.
 *
 * Soft link (document only): experiment run `params` may later store
 * `modelVersionId` — {@link ExperimentRunStore} API is unchanged this Sprint.
 * Does not bind {@link LanguageModelProvider}. Gates / Serving /
 * Observability remain deferred.
 */
export interface ModelRegistry {
  registerModel(input: ModelRegisterInput): Promise<ModelRecord>;
  getModel(
    workspaceId: string,
    modelId: ModelId,
  ): Promise<ModelRecord | null>;
  listModels(workspaceId: string): Promise<readonly ModelRecord[]>;
  registerVersion(
    input: ModelVersionRegisterInput,
  ): Promise<ModelVersionRecord>;
  getVersion(
    workspaceId: string,
    versionId: ModelVersionId,
  ): Promise<ModelVersionRecord | null>;
  listVersions(
    workspaceId: string,
    modelId: ModelId,
  ): Promise<readonly ModelVersionRecord[]>;
}
