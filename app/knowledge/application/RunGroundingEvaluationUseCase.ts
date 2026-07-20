import type { GenerateGroundedAnswerUseCase } from "./GenerateGroundedAnswerUseCase";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { GroundingEvaluationMetrics } from "../evaluation/GroundingEvaluationMetrics";
import type { GroundingEvaluator } from "../evaluation/GroundingEvaluator";
import type { GroundedAnswer } from "../rag/GroundedAnswer";

/**
 * Input for running grounding evaluation over insufficient-evidence cases.
 */
export interface RunGroundingEvaluationInput {
  dataset: EvaluationDataset;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Run-grounding-evaluation use case: for each case with
 * `expectInsufficientEvidence === true`, call
 * {@link GenerateGroundedAnswerUseCase}, then score with
 * {@link GroundingEvaluator}.
 *
 * Depends only on the grounded-answer use case and the grounding evaluator
 * port.
 */
export class RunGroundingEvaluationUseCase {
  constructor(
    private readonly generateGroundedAnswer: GenerateGroundedAnswerUseCase,
    private readonly groundingEvaluator: GroundingEvaluator,
  ) {}

  async execute(
    input: RunGroundingEvaluationInput,
  ): Promise<GroundingEvaluationMetrics> {
    const { dataset, retrievalLimit, maxCharacters } = this.toInput(input);

    const targetCases = dataset.cases.filter(
      (evaluationCase) => evaluationCase.expectInsufficientEvidence === true,
    );
    if (targetCases.length === 0) {
      throw new Error(
        "No grounding evaluation cases with expectInsufficientEvidence=true",
      );
    }

    const answersByCaseId = new Map<string, GroundedAnswer>();
    for (const evaluationCase of targetCases) {
      const answer = await this.generateGroundedAnswer.execute({
        workspaceId: evaluationCase.workspaceId,
        query: evaluationCase.query,
        retrievalLimit,
        maxCharacters,
      });
      answersByCaseId.set(evaluationCase.id, answer);
    }

    return this.groundingEvaluator.evaluate({ dataset, answersByCaseId });
  }

  private toInput(
    input: RunGroundingEvaluationInput,
  ): RunGroundingEvaluationInput {
    if (!input || typeof input !== "object") {
      throw new Error("RunGroundingEvaluationInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "RunGroundingEvaluationInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "RunGroundingEvaluationInput.maxCharacters must be a positive integer",
      );
    }
    return {
      dataset,
      retrievalLimit: input.retrievalLimit,
      maxCharacters: input.maxCharacters,
    };
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
    return dataset;
  }
}
