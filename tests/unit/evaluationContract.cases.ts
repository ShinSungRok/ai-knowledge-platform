/**
 * Unit-level cases for the `app/knowledge/evaluation` contract.
 *
 * Executed via:
 *
 *   pnpm validate:evaluation:contract
 */
export const EVALUATION_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "evaluator_ports_are_implementable_and_callable",
  "metrics_and_report_shapes_accommodate_contract_fields",
  "top_level_barrel_exports_contract_types",
] as const;
