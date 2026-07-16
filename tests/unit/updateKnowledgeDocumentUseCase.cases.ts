/**
 * Unit-level cases for UpdateKnowledgeDocumentUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:update
 *
 * Covered behaviors:
 * - updates title only and preserves text
 * - updates text only and preserves title
 * - rejects missing document id
 * - rejects empty patch / invalid title
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const UPDATE_KNOWLEDGE_DOCUMENT_USE_CASE_UNIT_CASES = [
  "updates_title_only_preserves_text",
  "updates_text_only_preserves_title",
  "rejects_missing_document",
  "rejects_empty_patch_and_invalid_title",
  "depends_on_repository_port_not_adapter",
] as const;
