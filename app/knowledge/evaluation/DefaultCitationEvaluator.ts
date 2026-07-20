import type { EvaluationDataset } from "./EvaluationDataset";
import type { CitationCaseScore } from "./CitationCaseScore";
import type { CitationEvaluationMetrics } from "./CitationEvaluationMetrics";
import type {
  CitationEvaluator,
  CitationEvaluatorInput,
} from "./CitationEvaluator";

/**
 * Deterministic {@link CitationEvaluator}: evidence-bound citation
 * correctness over every dataset case.
 *
 * Pure scoring — no constructor dependencies. Empty datasets are rejected.
 */
export class DefaultCitationEvaluator implements CitationEvaluator {
  evaluate(input: CitationEvaluatorInput): CitationEvaluationMetrics {
    const { dataset, citedByCaseId } = this.toInput(input);

    if (dataset.cases.length === 0) {
      throw new Error("EvaluationDataset.cases must not be empty");
    }

    const caseScores: CitationCaseScore[] = [];
    for (const evaluationCase of dataset.cases) {
      const cited = citedByCaseId.get(evaluationCase.id);
      if (!cited) {
        throw new Error(
          `Missing cited answer for caseId: ${evaluationCase.id}`,
        );
      }

      const evidenceCount = cited.answer.evidence.length;
      const citationCount = cited.citations.length;
      const evidenceChunkIds = new Set(
        cited.answer.evidence.map((block) => block.chunkId),
      );

      const allCitationsBound = cited.citations.every((citation) =>
        evidenceChunkIds.has(citation.chunkId),
      );
      const emptyEvidenceImpliesEmptyCitations =
        evidenceCount === 0 ? citationCount === 0 : true;
      const countsMatch = citationCount === evidenceCount;
      const passed =
        allCitationsBound && emptyEvidenceImpliesEmptyCitations && countsMatch;

      caseScores.push({
        caseId: evaluationCase.id,
        passed,
        citationCount,
        evidenceCount,
      });
    }

    const caseCount = caseScores.length;
    const passedCount = caseScores.filter((score) => score.passed).length;
    return {
      caseCount,
      evidenceBoundRate: passedCount / caseCount,
      caseScores,
    };
  }

  private toInput(input: CitationEvaluatorInput): CitationEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("CitationEvaluatorInput must be an object");
    }
    const dataset = this.assertDataset(input.dataset);
    if (!(input.citedByCaseId instanceof Map)) {
      throw new Error("CitationEvaluatorInput.citedByCaseId must be a Map");
    }
    return { dataset, citedByCaseId: input.citedByCaseId };
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
