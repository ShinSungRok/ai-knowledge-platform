import type { EvaluationGateComparator } from "./EvaluationGateComparator";

/**
 * One numeric threshold rule against a metric key.
 */
export interface EvaluationGateRule {
  metricKey: string;
  comparator: EvaluationGateComparator;
  threshold: number;
}
