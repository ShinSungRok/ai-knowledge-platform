import type { WorkflowContentCaseScore } from "./WorkflowContentCaseScore";

/**
 * Aggregate Multi-Agent workflow **content** evaluation metrics — the
 * LLM-as-judge counterpart to {@link WorkflowEvaluationMetrics}.
 */
export interface WorkflowContentEvaluationMetrics {
  datasetId: string;
  caseCount: number;
  passedCount: number;
  /** `passedCount / caseCount` in `[0, 1]`. */
  passRate: number;
  caseScores: readonly WorkflowContentCaseScore[];
}
