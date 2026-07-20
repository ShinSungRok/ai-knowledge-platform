/**
 * Unit-level cases for `SqlKnowledgeDocumentRepository`.
 *
 * Executed via:
 *
 *   pnpm validate:repository:sql-document
 */
export const SQL_KNOWLEDGE_DOCUMENT_REPOSITORY_UNIT_CASES = [
  "save_find_by_id",
  "find_missing_null",
  "find_all_overwrite_order",
  "defensive_copy",
  "delete_by_id",
  "input_validation",
  "workspace_isolation",
] as const;
