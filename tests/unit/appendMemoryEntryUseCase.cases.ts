/**
 * Unit-level cases for AppendMemoryEntryUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:memory-append
 */
export const APPEND_MEMORY_ENTRY_USE_CASE_UNIT_CASES = [
  "depends_only_on_memory_store_port",
  "execute_delegates_to_append",
  "invalid_input_rejected_without_store_call",
] as const;
