/**
 * Unit-level cases for UpdateKnowledgeDocumentUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:update
 *
 * Covered behaviors:
 * - updates title only, preserves text and sourceId
 * - updates text only and preserves title
 * - rejects missing document id
 * - rejects a document that exists only in a different workspace (treated
 *   as not found; the original document is left untouched)
 * - rejects empty patch / invalid title / invalid workspaceId
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const UPDATE_KNOWLEDGE_DOCUMENT_USE_CASE_UNIT_CASES = [
  "updates_title_only_preserves_text",
  "updates_text_only_preserves_title",
  "rejects_missing_document",
  "rejects_cross_workspace_update",
  "rejects_empty_patch_and_invalid_title_and_workspaceId",
  "depends_on_repository_port_not_adapter",
] as const;
