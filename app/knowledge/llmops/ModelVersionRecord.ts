import type { ModelId } from "./ModelId";
import type { ModelVersionId } from "./ModelVersionId";

/**
 * One version of a registered model. `providerModel` is opaque and may
 * later map to HTTP LLM config `model` — this Sprint does not bind
 * {@link LanguageModelProvider}.
 */
export interface ModelVersionRecord {
  id: ModelVersionId;
  modelId: ModelId;
  workspaceId: string;
  version: string;
  providerModel: string;
  metadata?: Readonly<Record<string, string>>;
}
