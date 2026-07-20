/**
 * Unit-level cases for `RunRetrievalEvaluationUseCase`.
 *
 * Executed via:
 *
 *   pnpm validate:application:eval-retrieval
 */
export const RUN_RETRIEVAL_EVALUATION_USE_CASE_UNIT_CASES = [
  "depends_only_on_retrieve_hybrid_and_retrieval_evaluator",
  "delegates_per_case_then_evaluator",
  "rejects_invalid_input_without_calls",
] as const;
