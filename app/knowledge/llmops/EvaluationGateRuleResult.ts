import type { EvaluationGateComparator } from "./EvaluationGateComparator";

/**
 * Outcome of evaluating one {@link EvaluationGateRule}.
 */
export interface EvaluationGateRuleResult {
  metricKey: string;
  comparator: EvaluationGateComparator;
  threshold: number;
  actual: number | undefined;
  passed: boolean;
}
