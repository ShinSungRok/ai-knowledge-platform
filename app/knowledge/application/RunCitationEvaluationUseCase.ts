import type { GenerateCitedGroundedAnswerUseCase } from "./GenerateCitedGroundedAnswerUseCase";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { CitationEvaluationMetrics } from "../evaluation/CitationEvaluationMetrics";
import type { CitationEvaluator } from "../evaluation/CitationEvaluator";

/**
 * Input for running citation evaluation over a dataset via cited answers.
 */
export interface RunCitationEvaluationInput {
  dataset: EvaluationDataset;
  retrievalLimit: number;
  maxCharacters: number;
}

/**
 * Run-citation-evaluation use case: for each dataset case, call
 * {@link GenerateCitedGroundedAnswerUseCase}, then score with
 * {@link CitationEvaluator}.
 *
 * Depends only on the cited-answer use case and the citation evaluator
 * port.
 */
export class RunCitationEvaluationUseCase {
  constructor(
    private readonly generateCitedGroundedAnswer: GenerateCitedGroundedAnswerUseCase,
    private readonly citationEvaluator: CitationEvaluator,
  ) {}

  async execute(
    input: RunCitationEvaluationInput,
  ): Promise<CitationEvaluationMetrics> {
    const { dataset, retrievalLimit, maxCharacters } = this.toInput(input);

    const citedByCaseId = new Map<string, CitedGroundedAnswer>();
    for (const evaluationCase of dataset.cases) {
      const cited = await this.generateCitedGroundedAnswer.execute({
        workspaceId: evaluationCase.workspaceId,
        query: evaluationCase.query,
        retrievalLimit,
        maxCharacters,
      });
      citedByCaseId.set(evaluationCase.id, cited);
    }

    return this.citationEvaluator.evaluate({ dataset, citedByCaseId });
  }

  private toInput(
    input: RunCitationEvaluationInput,
  ): RunCitationEvaluationInput {
    if (!input || typeof input !== "object") {
      throw new Error("RunCitationEvaluationInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (
      typeof input.retrievalLimit !== "number" ||
      !Number.isInteger(input.retrievalLimit) ||
      input.retrievalLimit <= 0
    ) {
      throw new Error(
        "RunCitationEvaluationInput.retrievalLimit must be a positive integer",
      );
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "RunCitationEvaluationInput.maxCharacters must be a positive integer",
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
    if (dataset.cases.length === 0) {
      throw new Error("EvaluationDataset.cases must not be empty");
    }
    return dataset;
  }
}
