import type { RetrieveHybridKnowledgeChunksUseCase } from "./RetrieveHybridKnowledgeChunksUseCase";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { RetrievalEvaluationMetrics } from "../evaluation/RetrievalEvaluationMetrics";
import type { RetrievalEvaluator } from "../evaluation/RetrievalEvaluator";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Input for running retrieval evaluation over a dataset via hybrid search.
 */
export interface RunRetrievalEvaluationInput {
  dataset: EvaluationDataset;
  limit: number;
}

/**
 * Run-retrieval-evaluation use case: for each dataset case, call
 * {@link RetrieveHybridKnowledgeChunksUseCase}, then score with
 * {@link RetrievalEvaluator}.
 *
 * Depends only on the hybrid retrieve use case and the retrieval evaluator
 * port — never on concrete search adapters or evaluation adapters beyond
 * the port.
 */
export class RunRetrievalEvaluationUseCase {
  constructor(
    private readonly retrieveHybridKnowledgeChunks: RetrieveHybridKnowledgeChunksUseCase,
    private readonly retrievalEvaluator: RetrievalEvaluator,
  ) {}

  async execute(
    input: RunRetrievalEvaluationInput,
  ): Promise<RetrievalEvaluationMetrics> {
    const { dataset, limit } = this.toInput(input);

    const retrievedByCaseId = new Map<string, RetrievalResult>();
    for (const evaluationCase of dataset.cases) {
      const result = await this.retrieveHybridKnowledgeChunks.execute({
        workspaceId: evaluationCase.workspaceId,
        query: evaluationCase.query,
        limit,
      });
      retrievedByCaseId.set(evaluationCase.id, result);
    }

    return this.retrievalEvaluator.evaluate({ dataset, retrievedByCaseId });
  }

  private toInput(input: RunRetrievalEvaluationInput): RunRetrievalEvaluationInput {
    if (!input || typeof input !== "object") {
      throw new Error("RunRetrievalEvaluationInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (
      typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit <= 0
    ) {
      throw new Error(
        "RunRetrievalEvaluationInput.limit must be a positive integer",
      );
    }
    return { dataset, limit: input.limit };
  }

  private assertDataset(dataset: EvaluationDataset): EvaluationDataset {
    if (!dataset || typeof dataset !== "object") {
      throw new Error("EvaluationDataset must be an object");
    }
    if (typeof dataset.id !== "string" || dataset.id.trim().length === 0) {
      throw new Error("EvaluationDataset.id must be a non-empty string");
    }
    if (!Array.isArray(dataset.cases)) {
      throw new Error("EvaluationDataset.cases must be an array");
    }
    if (dataset.cases.length === 0) {
      throw new Error("EvaluationDataset.cases must not be empty");
    }
    for (const evaluationCase of dataset.cases) {
      if (!evaluationCase || typeof evaluationCase !== "object") {
        throw new Error("EvaluationCase must be an object");
      }
      if (
        typeof evaluationCase.id !== "string" ||
        evaluationCase.id.trim().length === 0
      ) {
        throw new Error("EvaluationCase.id must be a non-empty string");
      }
      if (
        typeof evaluationCase.workspaceId !== "string" ||
        evaluationCase.workspaceId.trim().length === 0
      ) {
        throw new Error(
          "EvaluationCase.workspaceId must be a non-empty string",
        );
      }
      if (
        typeof evaluationCase.query !== "string" ||
        evaluationCase.query.trim().length === 0
      ) {
        throw new Error("EvaluationCase.query must be a non-empty string");
      }
      if (!Array.isArray(evaluationCase.expectedChunkIds)) {
        throw new Error("EvaluationCase.expectedChunkIds must be an array");
      }
    }
    return dataset;
  }
}
