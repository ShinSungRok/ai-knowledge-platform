/**
 * Unit-level cases for ListKnowledgeDocumentsUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application
 *
 * Covered behaviors:
 * - empty repository returns empty list
 * - lists all seeded knowledge documents
 * - use case depends on KnowledgeDocumentRepository port only
 * - concrete adapter is injectable via the port (composition-style wiring)
 */
export const LIST_KNOWLEDGE_DOCUMENTS_USE_CASE_UNIT_CASES = [
  "empty_repository_returns_empty_list",
  "lists_seeded_knowledge_documents",
  "depends_on_repository_port_not_adapter",
  "accepts_port_injected_adapter",
] as const;
