/**
 * Unit-level cases for ExportKnowledgeDocumentsUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:export
 *
 * Covered behaviors:
 * - defaults to json format and preserves sourceId provenance
 * - exports an empty json array when repository is empty
 * - produces csv with a header row, with columns fixed to
 *   id,sourceId,title,text
 * - escapes csv commas/quotes/newlines correctly, including the sourceId
 *   column
 * - export only includes documents from the requested workspace
 * - rejects unsupported export format and invalid workspaceId
 * - use case depends on KnowledgeDocumentRepository port only
 */
export const EXPORT_KNOWLEDGE_DOCUMENTS_USE_CASE_UNIT_CASES = [
  "defaults_to_json_format_preserves_sourceId",
  "exports_empty_json_array",
  "exports_csv_with_header_including_sourceId",
  "escapes_csv_special_characters",
  "scoped_to_workspaceId",
  "rejects_invalid_format_and_workspaceId",
  "depends_on_repository_port_not_adapter",
] as const;
