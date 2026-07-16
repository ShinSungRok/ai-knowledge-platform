/**
 * Unit-level cases for DefaultInMemoryKnowledgeSourceRepository.
 *
 * Executed via the module validation runner (Project1 style) — no test
 * framework dependency:
 *
 *   pnpm validate:repository:source
 *
 * Covered behaviors:
 * - save + findById round-trip
 * - findById returns null for missing ids
 * - defensive copies on save/read
 * - rejects invalid id/name/workspaceId
 * - implements KnowledgeSourceRepository port
 * - the same id is independent across different workspaces
 * - findById never crosses workspace boundaries
 */
export const DEFAULT_IN_MEMORY_KNOWLEDGE_SOURCE_REPOSITORY_UNIT_CASES = [
  "save_and_findById_round_trip",
  "findById_missing_returns_null",
  "defensive_copy_on_save_and_read",
  "rejects_invalid_id_and_name_and_workspaceId",
  "implements_KnowledgeSourceRepository_port",
  "same_id_independent_across_workspaces",
  "cross_workspace_access_is_blocked",
] as const;
