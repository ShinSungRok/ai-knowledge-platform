import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { CitationEvaluationMetrics } from "./CitationEvaluationMetrics";
import type { EvaluationDataset } from "./EvaluationDataset";

/**
 * Input for scoring evidence-bound citation correctness.
 */
export interface CitationEvaluatorInput {
  dataset: EvaluationDataset;
  citedByCaseId: ReadonlyMap<string, CitedGroundedAnswer>;
}

/**
 * Pure scoring port: evidence-bound citation correctness.
 * Implementations must not depend on search/repository/LLM adapters.
 */
export interface CitationEvaluator {
  evaluate(input: CitationEvaluatorInput): CitationEvaluationMetrics;
}
