/**
 * Unit-level cases for RecallMemoryEntriesUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:memory-recall
 */
export const RECALL_MEMORY_ENTRIES_USE_CASE_UNIT_CASES = [
  "depends_only_on_memory_store_port",
  "execute_without_limit_returns_all",
  "limit_returns_newest_entries_ascending",
  "invalid_input_rejected_without_store_call",
] as const;
