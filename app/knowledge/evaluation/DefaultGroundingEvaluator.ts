import type { EvaluationDataset } from "./EvaluationDataset";
import type { GroundingCaseScore } from "./GroundingCaseScore";
import type { GroundingEvaluationMetrics } from "./GroundingEvaluationMetrics";
import type {
  GroundingEvaluator,
  GroundingEvaluatorInput,
} from "./GroundingEvaluator";

/**
 * Deterministic {@link GroundingEvaluator}: insufficient-evidence policy
 * compliance over cases with `expectInsufficientEvidence === true`.
 *
 * Pure scoring — no constructor dependencies. Does not copy assembler
 * message strings; scores only `insufficientEvidence` and empty evidence.
 */
export class DefaultGroundingEvaluator implements GroundingEvaluator {
  evaluate(input: GroundingEvaluatorInput): GroundingEvaluationMetrics {
    const { dataset, answersByCaseId } = this.toInput(input);

    const targetCases = dataset.cases.filter(
      (evaluationCase) => evaluationCase.expectInsufficientEvidence === true,
    );
    if (targetCases.length === 0) {
      throw new Error(
        "No grounding evaluation cases with expectInsufficientEvidence=true",
      );
    }

    const caseScores: GroundingCaseScore[] = [];
    for (const evaluationCase of targetCases) {
      const answer = answersByCaseId.get(evaluationCase.id);
      if (!answer) {
        throw new Error(
          `Missing grounded answer for caseId: ${evaluationCase.id}`,
        );
      }
      const insufficientEvidence = answer.insufficientEvidence === true;
      const passed =
        insufficientEvidence === true && answer.evidence.length === 0;
      caseScores.push({
        caseId: evaluationCase.id,
        passed,
        insufficientEvidence,
      });
    }

    const caseCount = caseScores.length;
    const passedCount = caseScores.filter((score) => score.passed).length;
    return {
      caseCount,
      complianceRate: passedCount / caseCount,
      caseScores,
    };
  }

  private toInput(input: GroundingEvaluatorInput): GroundingEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("GroundingEvaluatorInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (!(input.answersByCaseId instanceof Map)) {
      throw new Error("GroundingEvaluatorInput.answersByCaseId must be a Map");
    }
    return { dataset, answersByCaseId: input.answersByCaseId };
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
