/**
 * Unit-level cases for InMemoryJobStore.
 *
 * Executed via:
 *
 *   pnpm validate:jobs:store
 */
export const IN_MEMORY_JOB_STORE_UNIT_CASES = [
  "enqueue_and_list_ordering",
  "get_by_id_and_save_replace",
  "workspace_isolation_and_defensive_copies",
  "invalid_input_is_rejected",
] as const;
