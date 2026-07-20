/**
 * Unit-level cases for `RunCitationEvaluationUseCase`.
 *
 * Executed via:
 *
 *   pnpm validate:application:eval-citation
 */
export const RUN_CITATION_EVALUATION_USE_CASE_UNIT_CASES = [
  "depends_only_on_generate_cited_answer_and_citation_evaluator",
  "delegates_per_case",
  "rejects_empty_dataset",
] as const;
