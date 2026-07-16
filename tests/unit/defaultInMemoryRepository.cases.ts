/**
 * Unit-level cases for DefaultInMemoryRepository.
 *
 * Executed via the module validation runner (Project1 style) — no test
 * framework dependency in Task 2:
 *
 *   pnpm validate:repository
 *
 * Covered behaviors:
 * - save + findById round-trip
 * - findById returns null for missing ids
 * - findAll lists all saved documents
 * - save overwrites by id
 * - defensive copies on save/read
 * - deleteById removes a stored document
 * - rejects invalid id/title
 * - implements KnowledgeDocumentRepository port
 */
export const DEFAULT_IN_MEMORY_REPOSITORY_UNIT_CASES = [
  "save_and_findById_round_trip",
  "findById_missing_returns_null",
  "findAll_lists_saved_documents",
  "save_overwrites_by_id",
  "defensive_copy_on_save_and_read",
  "deleteById_removes_document",
  "rejects_invalid_id_and_title",
  "implements_KnowledgeDocumentRepository_port",
] as const;
