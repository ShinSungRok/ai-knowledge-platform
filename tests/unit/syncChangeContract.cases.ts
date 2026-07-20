/**
 * Unit-level cases for the pipeline sync change-set / lifecycle contract.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:sync-change-contract
 */
export const SYNC_CHANGE_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "sync_change_ports_are_implementable_and_callable",
  "change_set_and_lifecycle_shapes_accommodate_contract_fields",
  "top_level_barrel_exports_contract_types",
] as const;
