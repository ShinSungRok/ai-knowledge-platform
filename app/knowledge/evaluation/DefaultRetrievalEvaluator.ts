import type { EvaluationDataset } from "./EvaluationDataset";
import type { RetrievalCaseScore } from "./RetrievalCaseScore";
import type { RetrievalEvaluationMetrics } from "./RetrievalEvaluationMetrics";
import type {
  RetrievalEvaluator,
  RetrievalEvaluatorInput,
} from "./RetrievalEvaluator";

/**
 * Deterministic {@link RetrievalEvaluator}: Hit@K and mean reciprocal rank
 * over pre-fetched {@link RetrievalResult}s.
 *
 * Pure scoring — no constructor dependencies and no search/repository/LLM
 * adapters. Empty datasets are rejected. Missing retrieved entries throw.
 */
export class DefaultRetrievalEvaluator implements RetrievalEvaluator {
  evaluate(input: RetrievalEvaluatorInput): RetrievalEvaluationMetrics {
    const { dataset, retrievedByCaseId } = this.toInput(input);

    if (dataset.cases.length === 0) {
      throw new Error("EvaluationDataset.cases must not be empty");
    }

    const caseScores: RetrievalCaseScore[] = [];
    for (const evaluationCase of dataset.cases) {
      const retrieved = retrievedByCaseId.get(evaluationCase.id);
      if (!retrieved) {
        throw new Error(
          `Missing retrieved result for caseId: ${evaluationCase.id}`,
        );
      }

      const rankedChunkIds = retrieved.chunks.map((entry) => entry.chunk.id);
      const expected = evaluationCase.expectedChunkIds;
      const hit = expected.some((id) => rankedChunkIds.includes(id));

      let reciprocalRank = 0;
      for (let index = 0; index < rankedChunkIds.length; index += 1) {
        const chunkId = rankedChunkIds[index];
        if (chunkId !== undefined && expected.includes(chunkId)) {
          reciprocalRank = 1 / (index + 1);
          break;
        }
      }

      caseScores.push({
        caseId: evaluationCase.id,
        hit,
        reciprocalRank,
      });
    }

    const caseCount = caseScores.length;
    const hitCount = caseScores.filter((score) => score.hit).length;
    const meanReciprocalRank =
      caseScores.reduce((sum, score) => sum + score.reciprocalRank, 0) /
      caseCount;

    return {
      caseCount,
      hitRateAtK: hitCount / caseCount,
      meanReciprocalRank,
      caseScores,
    };
  }

  private toInput(input: RetrievalEvaluatorInput): RetrievalEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("RetrievalEvaluatorInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (!(input.retrievedByCaseId instanceof Map)) {
      throw new Error(
        "RetrievalEvaluatorInput.retrievedByCaseId must be a Map",
      );
    }
    return { dataset, retrievedByCaseId: input.retrievedByCaseId };
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
    for (const evaluationCase of dataset.cases) {
      this.assertCase(evaluationCase);
    }
    return dataset;
  }

  private assertCase(evaluationCase: EvaluationDataset["cases"][number]): void {
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
      throw new Error("EvaluationCase.workspaceId must be a non-empty string");
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
    for (const chunkId of evaluationCase.expectedChunkIds) {
      if (typeof chunkId !== "string" || chunkId.trim().length === 0) {
        throw new Error(
          "EvaluationCase.expectedChunkIds entries must be non-empty strings",
        );
      }
    }
  }
}
