import type { CitationEvaluationMetrics } from "./CitationEvaluationMetrics";
import type { GroundingEvaluationMetrics } from "./GroundingEvaluationMetrics";
import type { RetrievalEvaluationMetrics } from "./RetrievalEvaluationMetrics";

/**
 * Optional multi-metric evaluation report keyed by dataset id.
 *
 * Individual evaluators produce their own metrics; assembling a combined
 * report is a later concern.
 */
export interface EvaluationReport {
  datasetId: string;
  retrieval?: RetrievalEvaluationMetrics;
  grounding?: GroundingEvaluationMetrics;
  citation?: CitationEvaluationMetrics;
}
