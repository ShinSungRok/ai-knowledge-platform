/**
 * Unit-level cases for the `app/knowledge/jobs` contract.
 *
 * Executed via:
 *
 *   pnpm validate:jobs:contract
 */
export const JOB_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "job_ports_are_implementable_and_callable",
  "top_level_barrel_exports_contract_types",
] as const;
