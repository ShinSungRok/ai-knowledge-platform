/**
 * Unit-level cases for CreateKnowledgeSourceUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:source
 *
 * Covered behaviors:
 * - create persists a knowledge source through the repository port
 * - duplicate id is rejected within the same workspace
 * - the same id is allowed independently in a different workspace
 * - invalid id/name/workspaceId input is rejected
 * - use case depends on KnowledgeSourceRepository port only
 */
export const CREATE_KNOWLEDGE_SOURCE_USE_CASE_UNIT_CASES = [
  "creates_and_persists_knowledge_source",
  "rejects_duplicate_id_within_workspace",
  "same_id_allowed_in_different_workspace",
  "rejects_invalid_id_and_name_and_workspaceId",
  "depends_on_repository_port_not_adapter",
] as const;
