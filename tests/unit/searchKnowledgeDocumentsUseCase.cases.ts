/**
 * Unit-level cases for SearchKnowledgeDocumentsUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:search
 *
 * Covered behaviors:
 * - matches title and text by default (case-insensitive)
 * - respects field scope (title-only / text-only)
 * - returns empty list when nothing matches
 * - does not match documents belonging to a different workspace
 * - rejects empty query, empty fields, and invalid workspaceId
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const SEARCH_KNOWLEDGE_DOCUMENTS_USE_CASE_UNIT_CASES = [
  "matches_title_and_text_by_default",
  "respects_field_scope",
  "returns_empty_when_no_match",
  "scoped_to_workspaceId",
  "rejects_invalid_query_and_fields_and_workspaceId",
  "depends_on_repository_port_not_adapter",
] as const;
