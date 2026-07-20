/**
 * Unit-level cases for observability Logger/Metrics contracts.
 *
 * Executed via:
 *
 *   pnpm validate:observability:contract
 */
export const OBSERVABILITY_CONTRACT_UNIT_CASES = [
  "module_constant",
  "logger_order_and_defensive_copies",
  "metrics_accumulate_and_sort",
  "ports_callable",
] as const;
