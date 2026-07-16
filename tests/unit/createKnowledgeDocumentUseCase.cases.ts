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
 * - duplicate id is rejected within the same workspace
 * - the same id is allowed independently in a different workspace
 * - a document referencing an unregistered sourceId is rejected and not saved
 * - a document referencing a source registered in a different workspace is
 *   rejected and not saved
 * - invalid id/sourceId/title/workspaceId input is rejected
 * - use case depends on KnowledgeDocumentRepository and
 *   KnowledgeSourceRepository ports only
 */
export const CREATE_KNOWLEDGE_DOCUMENT_USE_CASE_UNIT_CASES = [
  "creates_and_persists_knowledge_document",
  "created_document_visible_to_list_use_case",
  "rejects_duplicate_id",
  "same_id_allowed_in_different_workspace",
  "rejects_unregistered_source",
  "rejects_cross_workspace_source_reference",
  "rejects_invalid_id_and_sourceId_and_title_and_workspaceId",
  "depends_on_repository_ports_not_adapters",
] as const;
