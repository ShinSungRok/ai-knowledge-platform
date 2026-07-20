import { KNOWLEDGE_MODULE_EVALUATION } from "./index";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { CitationEvaluationMetrics } from "./CitationEvaluationMetrics";
import type {
  CitationEvaluator,
  CitationEvaluatorInput,
} from "./CitationEvaluator";
import type { EvaluationDataset } from "./EvaluationDataset";
import type { EvaluationReport } from "./EvaluationReport";
import type { GroundingEvaluationMetrics } from "./GroundingEvaluationMetrics";
import type {
  GroundingEvaluator,
  GroundingEvaluatorInput,
} from "./GroundingEvaluator";
import type { RetrievalEvaluationMetrics } from "./RetrievalEvaluationMetrics";
import type {
  RetrievalEvaluator,
  RetrievalEvaluatorInput,
} from "./RetrievalEvaluator";
import type {
  CitationEvaluator as TopLevelCitationEvaluator,
  EvaluationDataset as TopLevelEvaluationDataset,
  EvaluationReport as TopLevelEvaluationReport,
  GroundingEvaluator as TopLevelGroundingEvaluator,
  RetrievalEvaluator as TopLevelRetrievalEvaluator,
} from "../index";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

class FakeRetrievalEvaluator implements RetrievalEvaluator {
  evaluate(input: RetrievalEvaluatorInput): RetrievalEvaluationMetrics {
    const caseScores = input.dataset.cases.map((evaluationCase) => ({
      caseId: evaluationCase.id,
      hit: (input.retrievedByCaseId.get(evaluationCase.id)?.chunks.length ?? 0) > 0,
      reciprocalRank: 1,
    }));
    return {
      caseCount: caseScores.length,
      hitRateAtK: caseScores.every((s) => s.hit) ? 1 : 0,
      meanReciprocalRank: 1,
      caseScores,
    };
  }
}

class FakeGroundingEvaluator implements GroundingEvaluator {
  evaluate(input: GroundingEvaluatorInput): GroundingEvaluationMetrics {
    const caseScores = input.dataset.cases
      .filter((c) => c.expectInsufficientEvidence === true)
      .map((evaluationCase) => {
        const answer = input.answersByCaseId.get(evaluationCase.id);
        return {
          caseId: evaluationCase.id,
          passed: answer?.insufficientEvidence === true,
          insufficientEvidence: answer?.insufficientEvidence === true,
        };
      });
    return {
      caseCount: caseScores.length,
      complianceRate: caseScores.length === 0 ? 0 : 1,
      caseScores,
    };
  }
}

class FakeCitationEvaluator implements CitationEvaluator {
  evaluate(input: CitationEvaluatorInput): CitationEvaluationMetrics {
    const caseScores = input.dataset.cases.map((evaluationCase) => {
      const cited = input.citedByCaseId.get(evaluationCase.id);
      const evidenceCount = cited?.answer.evidence.length ?? 0;
      const citationCount = cited?.citations.length ?? 0;
      return {
        caseId: evaluationCase.id,
        passed: evidenceCount === citationCount,
        citationCount,
        evidenceCount,
      };
    });
    return {
      caseCount: caseScores.length,
      evidenceBoundRate: 1,
      caseScores,
    };
  }
}

function assertModuleConstant(): void {
  console.log(
    "[evaluation] KNOWLEDGE_MODULE_EVALUATION constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_EVALUATION,
    "app/knowledge/evaluation",
    "unexpected KNOWLEDGE_MODULE_EVALUATION value",
  );
}

function assertPortsImplementable(): void {
  console.log(
    "[evaluation] evaluator ports (Retrieval/Grounding/Citation) are implementable and callable...",
  );
  const retrieval: RetrievalEvaluator = new FakeRetrievalEvaluator();
  const grounding: GroundingEvaluator = new FakeGroundingEvaluator();
  const citation: CitationEvaluator = new FakeCitationEvaluator();

  assertTruthy(typeof retrieval.evaluate === "function", "retrieval.evaluate");
  assertTruthy(typeof grounding.evaluate === "function", "grounding.evaluate");
  assertTruthy(typeof citation.evaluate === "function", "citation.evaluate");

  const dataset: EvaluationDataset = {
    id: "ds-1",
    cases: [
      {
        id: "case-1",
        workspaceId: "workspace-a",
        query: "what is knowledge?",
        expectedChunkIds: ["chunk-1"],
        expectInsufficientEvidence: true,
      },
    ],
  };

  const retrievalResult: RetrievalResult = {
    query: "what is knowledge?",
    chunks: [],
  };
  const retrievedByCaseId = new Map<string, RetrievalResult>([
    ["case-1", retrievalResult],
  ]);
  const retrievalMetrics = retrieval.evaluate({ dataset, retrievedByCaseId });
  assertEqual(retrievalMetrics.caseCount, 1, "retrieval caseCount");
  assertEqual(retrievalMetrics.caseScores[0]?.caseId, "case-1", "retrieval caseId");

  const answer: GroundedAnswer = {
    text: "insufficient",
    evidence: [],
    insufficientEvidence: true,
  };
  const answersByCaseId = new Map<string, GroundedAnswer>([["case-1", answer]]);
  const groundingMetrics = grounding.evaluate({ dataset, answersByCaseId });
  assertEqual(groundingMetrics.caseCount, 1, "grounding caseCount");
  assertEqual(groundingMetrics.caseScores[0]?.passed, true, "grounding passed");

  const cited: CitedGroundedAnswer = { answer, citations: [] };
  const citedByCaseId = new Map<string, CitedGroundedAnswer>([["case-1", cited]]);
  const citationMetrics = citation.evaluate({ dataset, citedByCaseId });
  assertEqual(citationMetrics.caseCount, 1, "citation caseCount");
  assertEqual(citationMetrics.caseScores[0]?.citationCount, 0, "citationCount");
}

function assertMetricsAndReportShapes(): void {
  console.log(
    "[evaluation] metrics and EvaluationReport shapes accommodate contract fields...",
  );

  const retrieval: RetrievalEvaluationMetrics = {
    caseCount: 2,
    hitRateAtK: 0.5,
    meanReciprocalRank: 0.75,
    caseScores: [
      { caseId: "a", hit: true, reciprocalRank: 1 },
      { caseId: "b", hit: false, reciprocalRank: 0 },
    ],
  };
  assertEqual(retrieval.hitRateAtK, 0.5, "hitRateAtK");

  const grounding: GroundingEvaluationMetrics = {
    caseCount: 1,
    complianceRate: 1,
    caseScores: [
      { caseId: "a", passed: true, insufficientEvidence: true },
    ],
  };
  assertEqual(grounding.complianceRate, 1, "complianceRate");

  const citation: CitationEvaluationMetrics = {
    caseCount: 1,
    evidenceBoundRate: 1,
    caseScores: [
      { caseId: "a", passed: true, citationCount: 2, evidenceCount: 2 },
    ],
  };
  assertEqual(citation.evidenceBoundRate, 1, "evidenceBoundRate");

  const report: EvaluationReport = {
    datasetId: "ds-1",
    retrieval,
    grounding,
    citation,
  };
  assertEqual(report.datasetId, "ds-1", "datasetId");
  assertTruthy(report.retrieval !== undefined, "retrieval present");
  assertTruthy(report.grounding !== undefined, "grounding present");
  assertTruthy(report.citation !== undefined, "citation present");

  const emptyReport: EvaluationReport = { datasetId: "ds-empty" };
  assertEqual(emptyReport.retrieval, undefined, "optional retrieval");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log(
    "[evaluation] top-level app/knowledge barrel re-exports evaluation contract types...",
  );
  const datasetAssignable: EvaluationDataset | null =
    null as TopLevelEvaluationDataset | null;
  const retrievalAssignable: RetrievalEvaluator | null =
    null as TopLevelRetrievalEvaluator | null;
  const groundingAssignable: GroundingEvaluator | null =
    null as TopLevelGroundingEvaluator | null;
  const citationAssignable: CitationEvaluator | null =
    null as TopLevelCitationEvaluator | null;
  const reportAssignable: EvaluationReport | null =
    null as TopLevelEvaluationReport | null;

  assertTruthy(datasetAssignable === null, "EvaluationDataset assignable");
  assertTruthy(retrievalAssignable === null, "RetrievalEvaluator assignable");
  assertTruthy(groundingAssignable === null, "GroundingEvaluator assignable");
  assertTruthy(citationAssignable === null, "CitationEvaluator assignable");
  assertTruthy(reportAssignable === null, "EvaluationReport assignable");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertPortsImplementable();
  assertMetricsAndReportShapes();
  assertTopLevelBarrelExportsContractTypes();
  console.log("Evaluation contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
