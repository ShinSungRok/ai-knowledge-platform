/**
 * Unit-level cases for `DefaultGroundingEvaluator`.
 *
 * Executed via:
 *
 *   pnpm validate:evaluation:grounding
 */
export const DEFAULT_GROUNDING_EVALUATOR_UNIT_CASES = [
  "port_contract",
  "scores_insufficient_evidence_compliance",
  "rejects_no_target_cases_and_missing_answers",
  "imports_no_adapters",
] as const;
