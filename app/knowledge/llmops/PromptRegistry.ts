import type { PromptTemplateId } from "./PromptTemplateId";
import type { PromptTemplateRecord } from "./PromptTemplateRecord";
import type { PromptVersionId } from "./PromptVersionId";
import type { PromptVersionRecord } from "./PromptVersionRecord";

/**
 * Input for registering one prompt template. Caller supplies `id`.
 */
export interface PromptTemplateRegisterInput {
  id: PromptTemplateId;
  workspaceId: string;
  name: string;
  description?: string;
}

/**
 * Input for registering one prompt template version. Caller supplies `id`.
 */
export interface PromptVersionRegisterInput {
  id: PromptVersionId;
  templateId: PromptTemplateId;
  workspaceId: string;
  version: string;
  body: string;
  metadata?: Readonly<Record<string, string>>;
}

/**
 * Port for workspace-scoped Prompt template / version registry.
 *
 * Soft link (document only): experiment run `params` may later store
 * `promptVersionId` — {@link ExperimentRunStore} API is unchanged this Sprint.
 * Gates / Serving / Observability remain deferred.
 */
export interface PromptRegistry {
  registerTemplate(
    input: PromptTemplateRegisterInput,
  ): Promise<PromptTemplateRecord>;
  getTemplate(
    workspaceId: string,
    templateId: PromptTemplateId,
  ): Promise<PromptTemplateRecord | null>;
  listTemplates(workspaceId: string): Promise<readonly PromptTemplateRecord[]>;
  registerVersion(
    input: PromptVersionRegisterInput,
  ): Promise<PromptVersionRecord>;
  getVersion(
    workspaceId: string,
    versionId: PromptVersionId,
  ): Promise<PromptVersionRecord | null>;
  listVersions(
    workspaceId: string,
    templateId: PromptTemplateId,
  ): Promise<readonly PromptVersionRecord[]>;
}
