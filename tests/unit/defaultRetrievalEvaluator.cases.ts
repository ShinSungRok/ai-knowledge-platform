/**
 * Unit-level cases for `DefaultRetrievalEvaluator`.
 *
 * Executed via:
 *
 *   pnpm validate:evaluation:retrieval
 */
export const DEFAULT_RETRIEVAL_EVALUATOR_UNIT_CASES = [
  "port_contract",
  "computes_hit_rate_and_mrr",
  "rejects_empty_dataset_and_missing_results",
  "rejects_invalid_input",
  "imports_no_adapters",
] as const;
