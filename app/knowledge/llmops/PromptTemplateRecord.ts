import type { PromptTemplateId } from "./PromptTemplateId";

/**
 * Workspace-scoped prompt template (name + optional description).
 * Versions live in {@link PromptVersionRecord}.
 */
export interface PromptTemplateRecord {
  id: PromptTemplateId;
  workspaceId: string;
  name: string;
  description?: string;
}
