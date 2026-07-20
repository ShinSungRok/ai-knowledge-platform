import type { GroundingCaseScore } from "./GroundingCaseScore";

/**
 * Aggregate grounding evaluation metrics (insufficient-evidence compliance).
 */
export interface GroundingEvaluationMetrics {
  caseCount: number;
  complianceRate: number;
  caseScores: readonly GroundingCaseScore[];
}
