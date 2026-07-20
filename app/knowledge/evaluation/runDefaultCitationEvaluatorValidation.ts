import { readFileSync } from "node:fs";
import path from "node:path";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { Citation } from "../citation/Citation";
import type { GroundingContextBlock } from "../context/GroundingContext";
import { DefaultCitationEvaluator } from "./DefaultCitationEvaluator";
import type { CitationEvaluator } from "./CitationEvaluator";
import type { EvaluationDataset } from "./EvaluationDataset";

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

function block(chunkId: string): GroundingContextBlock {
  return {
    sourceId: "s",
    documentId: "d",
    chunkId,
    score: 1,
    text: "e",
  };
}

function citation(chunkId: string): Citation {
  return {
    id: `cite:${chunkId}`,
    sourceId: "s",
    documentId: "d",
    chunkId,
    score: 1,
    excerpt: "e",
  };
}

function cited(
  chunkIds: string[],
  citationChunkIds: string[] = chunkIds,
): CitedGroundedAnswer {
  return {
    answer: {
      text: "t",
      evidence: chunkIds.map(block),
      insufficientEvidence: chunkIds.length === 0,
    },
    citations: citationChunkIds.map(citation),
  };
}

function assertPortContract(): void {
  console.log("[evaluation] port contract (CitationEvaluator)...");
  const evaluator: CitationEvaluator = new DefaultCitationEvaluator();
  assertTruthy(typeof evaluator.evaluate === "function", "evaluate defined");
}

function assertScoresEvidenceBoundCorrectness(): void {
  console.log(
    "[evaluation] evaluate scores evidence-bound citation correctness...",
  );
  const evaluator = new DefaultCitationEvaluator();
  const dataset: EvaluationDataset = {
    id: "ds",
    cases: [
      {
        id: "ok",
        workspaceId: "ws",
        query: "q1",
        expectedChunkIds: ["a"],
      },
      {
        id: "empty",
        workspaceId: "ws",
        query: "q2",
        expectedChunkIds: [],
        expectInsufficientEvidence: true,
      },
      {
        id: "unbound",
        workspaceId: "ws",
        query: "q3",
        expectedChunkIds: ["a"],
      },
    ],
  };
  const citedByCaseId = new Map<string, CitedGroundedAnswer>([
    ["ok", cited(["a", "b"])],
    ["empty", cited([])],
    ["unbound", cited(["a"], ["a", "x"])],
  ]);
  const metrics = evaluator.evaluate({ dataset, citedByCaseId });
  assertEqual(metrics.caseCount, 3, "caseCount");
  assertEqual(metrics.evidenceBoundRate, 2 / 3, "evidenceBoundRate");
  assertEqual(metrics.caseScores[0]?.passed, true, "ok passed");
  assertEqual(metrics.caseScores[1]?.passed, true, "empty passed");
  assertEqual(metrics.caseScores[2]?.passed, false, "unbound failed");
}

function assertRejectsEmptyDatasetAndMissing(): void {
  console.log(
    "[evaluation] evaluate rejects empty dataset and missing cited answers...",
  );
  const evaluator = new DefaultCitationEvaluator();
  assertThrows(
    () =>
      evaluator.evaluate({
        dataset: { id: "empty", cases: [] },
        citedByCaseId: new Map(),
      }),
    "cases must not be empty",
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
            },
          ],
        },
        citedByCaseId: new Map(),
      }),
    "Missing cited answer for caseId",
  );
}

function assertImportsNoAdapters(): void {
  console.log(
    "[evaluation] DefaultCitationEvaluator has no constructor deps and imports no adapters...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/evaluation/DefaultCitationEvaluator.ts",
    ),
    "utf8",
  );
  const forbidden = [
    "GenerateCitedGroundedAnswerUseCase",
    "DefaultCitationBuilder",
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
  assertScoresEvidenceBoundCorrectness();
  assertRejectsEmptyDatasetAndMissing();
  assertImportsNoAdapters();
  console.log("DefaultCitationEvaluator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
