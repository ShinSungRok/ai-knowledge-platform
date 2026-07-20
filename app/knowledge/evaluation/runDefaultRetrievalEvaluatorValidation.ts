import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import { DefaultRetrievalEvaluator } from "./DefaultRetrievalEvaluator";
import type { EvaluationDataset } from "./EvaluationDataset";
import type { RetrievalEvaluator } from "./RetrievalEvaluator";

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

function chunk(id: string): DocumentChunk {
  return {
    workspaceId: "workspace-a",
    id,
    documentId: "doc-1",
    text: id,
    order: 0,
  };
}

function result(chunkIds: string[]): RetrievalResult {
  return {
    query: "q",
    chunks: chunkIds.map((id) => ({ chunk: chunk(id), score: 1 })),
  };
}

function assertPortContract(): void {
  console.log("[evaluation] port contract (RetrievalEvaluator)...");
  const evaluator: RetrievalEvaluator = new DefaultRetrievalEvaluator();
  assertTruthy(typeof evaluator.evaluate === "function", "evaluate defined");
}

function assertComputesHitAndMrr(): void {
  console.log(
    "[evaluation] evaluate computes hitRateAtK and meanReciprocalRank deterministically...",
  );
  const evaluator = new DefaultRetrievalEvaluator();
  const dataset: EvaluationDataset = {
    id: "ds-1",
    cases: [
      {
        id: "c1",
        workspaceId: "workspace-a",
        query: "q1",
        expectedChunkIds: ["a"],
      },
      {
        id: "c2",
        workspaceId: "workspace-a",
        query: "q2",
        expectedChunkIds: ["b"],
      },
      {
        id: "c3",
        workspaceId: "workspace-a",
        query: "q3",
        expectedChunkIds: ["z"],
      },
    ],
  };
  const retrievedByCaseId = new Map<string, RetrievalResult>([
    ["c1", result(["a", "x"])],
    ["c2", result(["x", "b"])],
    ["c3", result(["x", "y"])],
  ]);

  const metrics = evaluator.evaluate({ dataset, retrievedByCaseId });
  assertEqual(metrics.caseCount, 3, "caseCount");
  assertEqual(metrics.hitRateAtK, 2 / 3, "hitRateAtK");
  assertEqual(metrics.meanReciprocalRank, (1 + 0.5 + 0) / 3, "MRR");
  assertEqual(metrics.caseScores[0]?.hit, true, "c1 hit");
  assertEqual(metrics.caseScores[0]?.reciprocalRank, 1, "c1 RR");
  assertEqual(metrics.caseScores[1]?.reciprocalRank, 0.5, "c2 RR");
  assertEqual(metrics.caseScores[2]?.hit, false, "c3 miss");
  assertEqual(metrics.caseScores[2]?.reciprocalRank, 0, "c3 RR");
}

function assertRejectsEmptyDatasetAndMissingResults(): void {
  console.log(
    "[evaluation] evaluate rejects empty dataset and missing retrieved entries...",
  );
  const evaluator = new DefaultRetrievalEvaluator();
  assertThrows(
    () =>
      evaluator.evaluate({
        dataset: { id: "empty", cases: [] },
        retrievedByCaseId: new Map(),
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
              workspaceId: "workspace-a",
              query: "q",
              expectedChunkIds: ["a"],
            },
          ],
        },
        retrievedByCaseId: new Map(),
      }),
    "Missing retrieved result for caseId",
  );
}

function assertRejectsInvalidInput(): void {
  console.log("[evaluation] evaluate rejects invalid input...");
  const evaluator = new DefaultRetrievalEvaluator();
  assertThrows(
    () =>
      evaluator.evaluate({
        // @ts-expect-error intentional
        dataset: null,
        retrievedByCaseId: new Map(),
      }),
    "EvaluationDataset must be an object",
  );
}

function assertImportsNoAdapters(): void {
  console.log(
    "[evaluation] DefaultRetrievalEvaluator has no constructor deps and imports no adapters...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/evaluation/DefaultRetrievalEvaluator.ts",
    ),
    "utf8",
  );
  const forbidden = [
    "RetrieveHybridKnowledgeChunksUseCase",
    "DefaultHybridSearch",
    "InMemoryVectorIndex",
    "../persistence",
    "../application",
  ];
  for (const reference of forbidden) {
    assertTruthy(!source.includes(reference), `must not reference "${reference}"`);
  }
  assertTruthy(!source.includes("constructor("), "no constructor deps");
}

async function main(): Promise<void> {
  assertPortContract();
  assertComputesHitAndMrr();
  assertRejectsEmptyDatasetAndMissingResults();
  assertRejectsInvalidInput();
  assertImportsNoAdapters();
  console.log("DefaultRetrievalEvaluator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
