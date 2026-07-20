/**
 * Unit-level cases for InMemoryMemoryStore.
 *
 * Executed via:
 *
 *   pnpm validate:memory:store
 *
 * Covered behaviors:
 * - no Knowledge/search/agent adapter imports
 * - append deterministic id/sequence + listBySession ascending order
 * - workspace isolation for the same sessionId
 * - defensive copies on read/write; empty session → []
 * - invalid input rejection
 */
export const IN_MEMORY_MEMORY_STORE_UNIT_CASES = [
  "imports_no_knowledge_or_search_adapters",
  "port_contract_is_implementable",
  "append_and_list_ordering",
  "workspace_isolation",
  "defensive_copy_and_empty_session",
  "invalid_input_is_rejected",
] as const;
