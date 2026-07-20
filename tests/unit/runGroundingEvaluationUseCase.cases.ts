/**
 * Unit-level cases for `RunGroundingEvaluationUseCase`.
 *
 * Executed via:
 *
 *   pnpm validate:application:eval-grounding
 */
export const RUN_GROUNDING_EVALUATION_USE_CASE_UNIT_CASES = [
  "depends_only_on_generate_grounded_answer_and_grounding_evaluator",
  "runs_only_target_cases",
  "rejects_without_target_cases",
] as const;
