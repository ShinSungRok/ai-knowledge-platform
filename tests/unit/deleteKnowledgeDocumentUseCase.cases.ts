/**
 * Unit-level cases for DeleteKnowledgeDocumentUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:delete
 *
 * Covered behaviors:
 * - deletes an existing knowledge document
 * - deleted document is absent from list/findById
 * - rejects missing document id
 * - rejects deleting a document that exists only in a different workspace
 *   (treated as not found; the original document survives)
 * - rejects invalid id/workspaceId
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const DELETE_KNOWLEDGE_DOCUMENT_USE_CASE_UNIT_CASES = [
  "deletes_existing_knowledge_document",
  "deleted_document_absent_from_list_and_findById",
  "rejects_missing_document",
  "rejects_cross_workspace_delete",
  "rejects_invalid_id_and_workspaceId",
  "depends_on_repository_port_not_adapter",
] as const;
