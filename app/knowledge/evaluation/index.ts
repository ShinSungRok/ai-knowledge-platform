/**
 * Module: `app/knowledge/evaluation`
 *
 * Knowledge Quality Evaluation — dataset/case contracts, retrieval /
 * grounding / citation metrics, and pure evaluator ports.
 *
 * Evaluation scores pre-computed retrieval/answer/citation artifacts; it
 * does not duplicate Domain or RAG business logic. Default evaluator
 * adapters and application run use cases are later tasks. Real benchmark
 * corpus loaders, network, and LLM-as-judge are out of scope.
 *
 * `DefaultRetrievalEvaluator` scores Hit@K / MRR deterministically from
 * pre-fetched retrieval results. `DefaultGroundingEvaluator` scores
 * insufficient-evidence compliance. Application run use cases execute
 * hybrid retrieval or grounded-answer generation per case then delegate
 * to evaluator ports. Citation evaluator adapters remain later.
 */
export const KNOWLEDGE_MODULE_EVALUATION = "app/knowledge/evaluation" as const;

export type { EvaluationCase } from "./EvaluationCase";
export type { EvaluationDataset } from "./EvaluationDataset";
export type { RetrievalCaseScore } from "./RetrievalCaseScore";
export type { RetrievalEvaluationMetrics } from "./RetrievalEvaluationMetrics";
export type { GroundingCaseScore } from "./GroundingCaseScore";
export type { GroundingEvaluationMetrics } from "./GroundingEvaluationMetrics";
export type { CitationCaseScore } from "./CitationCaseScore";
export type { CitationEvaluationMetrics } from "./CitationEvaluationMetrics";
export type { EvaluationReport } from "./EvaluationReport";
export type {
  RetrievalEvaluatorInput,
  RetrievalEvaluator,
} from "./RetrievalEvaluator";
export type {
  GroundingEvaluatorInput,
  GroundingEvaluator,
} from "./GroundingEvaluator";
export type {
  CitationEvaluatorInput,
  CitationEvaluator,
} from "./CitationEvaluator";
export { DefaultRetrievalEvaluator } from "./DefaultRetrievalEvaluator";
export { DefaultGroundingEvaluator } from "./DefaultGroundingEvaluator";
