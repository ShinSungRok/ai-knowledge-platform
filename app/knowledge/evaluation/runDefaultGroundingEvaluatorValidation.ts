import { readFileSync } from "node:fs";
import path from "node:path";
import { DefaultGroundingEvaluator } from "./DefaultGroundingEvaluator";
import type { EvaluationDataset } from "./EvaluationDataset";
import type { GroundingEvaluator } from "./GroundingEvaluator";
import type { GroundedAnswer } from "../rag/GroundedAnswer";

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

function assertThrows(fn: () => unknown, messageIncludes: string): void {
  try {
    fn();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageIncludes),
      `expected error to include "${messageIncludes}", got "${text}"`,
    );
    return;
  }
  throw new Error(`expected throw including "${messageIncludes}"`);
}

function answer(
  insufficientEvidence: boolean,
  evidenceLength: number,
): GroundedAnswer {
  return {
    text: "t",
    evidence: Array.from({ length: evidenceLength }, (_, i) => ({
      sourceId: "s",
      documentId: "d",
      chunkId: `c${i}`,
      score: 1,
      text: "e",
    })),
    insufficientEvidence,
  };
}

function assertPortContract(): void {
  console.log("[evaluation] port contract (GroundingEvaluator)...");
  const evaluator: GroundingEvaluator = new DefaultGroundingEvaluator();
  assertTruthy(typeof evaluator.evaluate === "function", "evaluate defined");
}

function assertScoresInsufficientEvidenceCompliance(): void {
  console.log(
    "[evaluation] evaluate scores only expectInsufficientEvidence cases...",
  );
  const evaluator = new DefaultGroundingEvaluator();
  const dataset: EvaluationDataset = {
    id: "ds",
    cases: [
      {
        id: "pass",
        workspaceId: "ws",
        query: "q1",
        expectedChunkIds: [],
        expectInsufficientEvidence: true,
      },
      {
        id: "fail",
        workspaceId: "ws",
        query: "q2",
        expectedChunkIds: [],
        expectInsufficientEvidence: true,
      },
      {
        id: "ignored",
        workspaceId: "ws",
        query: "q3",
        expectedChunkIds: ["x"],
      },
    ],
  };
  const answersByCaseId = new Map<string, GroundedAnswer>([
    ["pass", answer(true, 0)],
    ["fail", answer(false, 1)],
  ]);
  const metrics = evaluator.evaluate({ dataset, answersByCaseId });
  assertEqual(metrics.caseCount, 2, "only target cases counted");
  assertEqual(metrics.complianceRate, 0.5, "complianceRate");
  assertEqual(metrics.caseScores[0]?.passed, true, "pass case");
  assertEqual(metrics.caseScores[1]?.passed, false, "fail case");
}

function assertRejectsNoTargetCasesAndMissingAnswers(): void {
  console.log(
    "[evaluation] evaluate rejects no target cases and missing answers...",
  );
  const evaluator = new DefaultGroundingEvaluator();
  assertThrows(
    () =>
      evaluator.evaluate({
        dataset: {
          id: "ds",
          cases: [
            {
              id: "a",
              workspaceId: "ws",
              query: "q",
              expectedChunkIds: [],
            },
          ],
        },
        answersByCaseId: new Map(),
      }),
    "No grounding evaluation cases with expectInsufficientEvidence=true",
  );
  assertThrows(
    () =>
      evaluator.evaluate({
        dataset: {
          id: "ds",
          cases: [
            {
              id: "missing",
              workspaceId: "ws",
              query: "q",
              expectedChunkIds: [],
              expectInsufficientEvidence: true,
            },
          ],
        },
        answersByCaseId: new Map(),
      }),
    "Missing grounded answer for caseId",
  );
}

function assertImportsNoAdapters(): void {
  console.log(
    "[evaluation] DefaultGroundingEvaluator has no constructor deps and imports no adapters...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/evaluation/DefaultGroundingEvaluator.ts",
    ),
    "utf8",
  );
  const forbidden = [
    "GenerateGroundedAnswerUseCase",
    "DefaultGroundedAnswerAssembler",
    "../application",
    "../persistence",
  ];
  for (const reference of forbidden) {
    assertTruthy(!source.includes(reference), `must not reference "${reference}"`);
  }
  assertTruthy(!source.includes("constructor("), "no constructor deps");
}

async function main(): Promise<void> {
  assertPortContract();
  assertScoresInsufficientEvidenceCompliance();
  assertRejectsNoTargetCasesAndMissingAnswers();
  assertImportsNoAdapters();
  console.log("DefaultGroundingEvaluator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
