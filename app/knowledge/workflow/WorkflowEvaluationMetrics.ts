import type { WorkflowCaseScore } from "./WorkflowCaseScore";

/**
 * Aggregate Multi-Agent workflow evaluation metrics.
 *
 * Distinct from Project 2 RAG grounding/retrieval/citation metrics.
 */
export interface WorkflowEvaluationMetrics {
  datasetId: string;
  caseCount: number;
  passedCount: number;
  /** `passedCount / caseCount` in `[0, 1]`. */
  passRate: number;
  caseScores: readonly WorkflowCaseScore[];
}
