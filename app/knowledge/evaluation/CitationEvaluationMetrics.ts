import type { CitationCaseScore } from "./CitationCaseScore";

/**
 * Aggregate citation evaluation metrics (evidence-bound rate).
 */
export interface CitationEvaluationMetrics {
  caseCount: number;
  evidenceBoundRate: number;
  caseScores: readonly CitationCaseScore[];
}
