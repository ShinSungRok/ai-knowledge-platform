/**
 * Unit-level cases for the `app/knowledge/memory` contract
 * (MemoryEntryRole, MemoryEntry, MemoryStore port).
 *
 * Executed via:
 *
 *   pnpm validate:memory:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_MEMORY is exported with its expected value
 * - MemoryStore is implementable from just the exported contract types
 *   (FakeMemoryStore) and returns expected entry shapes
 * - the top-level app/knowledge barrel re-exports the MemoryStore type
 */
export const MEMORY_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "memory_store_port_is_implementable_and_callable",
  "top_level_barrel_exports_contract_types",
] as const;
