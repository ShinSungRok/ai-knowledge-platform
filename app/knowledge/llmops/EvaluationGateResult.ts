import type { EvaluationGateRuleResult } from "./EvaluationGateRuleResult";

/**
 * Aggregate gate outcome: `passed` is true only when every rule passes.
 */
export interface EvaluationGateResult {
  passed: boolean;
  ruleResults: readonly EvaluationGateRuleResult[];
}
