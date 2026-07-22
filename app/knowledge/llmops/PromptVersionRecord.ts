import type { PromptTemplateId } from "./PromptTemplateId";
import type { PromptVersionId } from "./PromptVersionId";

/**
 * One version of a prompt template. `version` is an opaque string
 * (semver-like); uniqueness is per template within a workspace.
 */
export interface PromptVersionRecord {
  id: PromptVersionId;
  templateId: PromptTemplateId;
  workspaceId: string;
  version: string;
  body: string;
  metadata?: Readonly<Record<string, string>>;
}
