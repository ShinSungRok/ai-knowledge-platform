import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { EvaluationDataset } from "./EvaluationDataset";
import type { GroundingEvaluationMetrics } from "./GroundingEvaluationMetrics";

/**
 * Input for scoring grounding / insufficient-evidence policy compliance.
 */
export interface GroundingEvaluatorInput {
  dataset: EvaluationDataset;
  answersByCaseId: ReadonlyMap<string, GroundedAnswer>;
}

/**
 * Pure scoring port: insufficient-evidence compliance over grounded answers.
 * Implementations must not depend on search/repository/LLM adapters.
 */
export interface GroundingEvaluator {
  evaluate(input: GroundingEvaluatorInput): GroundingEvaluationMetrics;
}
