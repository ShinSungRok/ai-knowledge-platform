import type { RetrievalCaseScore } from "./RetrievalCaseScore";

/**
 * Aggregate retrieval quality metrics over a dataset (Hit@K rate and MRR).
 */
export interface RetrievalEvaluationMetrics {
  caseCount: number;
  hitRateAtK: number;
  meanReciprocalRank: number;
  caseScores: readonly RetrievalCaseScore[];
}
