/**
 * Default minimum {@link LlmWorkflowRunContentEvaluator} score (LLM
 * judgment / 10, so 0..1) a case must reach to count as content-passed.
 * `0.6` is deliberately higher than P2's `MIN_LLM_RELEVANCE_SCORE` (0.4):
 * judging whether a full multi-agent run actually satisfied its
 * objective warrants a higher bar than judging whether a single passage
 * merely touches a query's topic — 6/10 admits a genuinely-completed but
 * imperfect run while rejecting one that only partially or tangentially
 * addressed the objective.
 */
export const MIN_LLM_JUDGE_SCORE = 0.6;
