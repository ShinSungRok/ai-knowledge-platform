/**
 * Unit-level cases for CreateKnowledgeDocumentUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:create
 *
 * Covered behaviors:
 * - create persists a knowledge document through the repository port
 * - created document is visible to list query use case
 * - duplicate id is rejected
 * - invalid id/title input is rejected
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const CREATE_KNOWLEDGE_DOCUMENT_USE_CASE_UNIT_CASES = [
  "creates_and_persists_knowledge_document",
  "created_document_visible_to_list_use_case",
  "rejects_duplicate_id",
  "rejects_invalid_id_and_title",
  "depends_on_repository_port_not_adapter",
] as const;
