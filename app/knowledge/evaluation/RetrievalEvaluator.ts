import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { EvaluationDataset } from "./EvaluationDataset";
import type { RetrievalEvaluationMetrics } from "./RetrievalEvaluationMetrics";

/**
 * Input for scoring retrieval quality against an {@link EvaluationDataset}.
 */
export interface RetrievalEvaluatorInput {
  dataset: EvaluationDataset;
  retrievedByCaseId: ReadonlyMap<string, RetrievalResult>;
}

/**
 * Pure scoring port: Hit@K / MRR over pre-fetched retrieval results.
 * Implementations must not depend on search/repository/LLM adapters.
 */
export interface RetrievalEvaluator {
  evaluate(input: RetrievalEvaluatorInput): RetrievalEvaluationMetrics;
}
