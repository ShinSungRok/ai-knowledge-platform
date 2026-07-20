import { readFileSync } from "node:fs";
import path from "node:path";
import {
  RunRetrievalEvaluationUseCase,
  type RunRetrievalEvaluationInput,
} from "./RunRetrievalEvaluationUseCase";
import { RetrieveHybridKnowledgeChunksUseCase } from "./RetrieveHybridKnowledgeChunksUseCase";
import { DefaultRetrievalEvaluator } from "../evaluation/DefaultRetrievalEvaluator";
import type { EvaluationDataset } from "../evaluation/EvaluationDataset";
import type { RetrievalEvaluator } from "../evaluation/RetrievalEvaluator";
import type { RetrievalEvaluationMetrics } from "../evaluation/RetrievalEvaluationMetrics";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { DocumentChunk } from "../domain/DocumentChunk";

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

async function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing: ${messageSubstring}`);
}

class FakeRetrieveHybrid {
  public calls: Array<{ workspaceId: string; query: string; limit: number }> =
    [];

  async execute(input: {
    workspaceId: string;
    query: string;
    limit: number;
  }): Promise<RetrievalResult> {
    this.calls.push(input);
    const chunk: DocumentChunk = {
      workspaceId: input.workspaceId,
      id: input.query === "hit" ? "expected" : "other",
      documentId: "doc-1",
      text: "t",
      order: 0,
    };
    return { query: input.query, chunks: [{ chunk, score: 1 }] };
  }
}

class RecordingEvaluator implements RetrievalEvaluator {
  public lastInput: {
    dataset: EvaluationDataset;
    retrievedByCaseId: ReadonlyMap<string, RetrievalResult>;
  } | null = null;

  evaluate(input: {
    dataset: EvaluationDataset;
    retrievedByCaseId: ReadonlyMap<string, RetrievalResult>;
  }): RetrievalEvaluationMetrics {
    this.lastInput = input;
    return {
      caseCount: input.dataset.cases.length,
      hitRateAtK: 1,
      meanReciprocalRank: 1,
      caseScores: input.dataset.cases.map((c) => ({
        caseId: c.id,
        hit: true,
        reciprocalRank: 1,
      })),
    };
  }
}

function assertDependsOnlyOnPorts(): void {
  console.log(
    "[application] RunRetrievalEvaluationUseCase depends only on RetrieveHybridKnowledgeChunksUseCase and RetrievalEvaluator...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/application/RunRetrievalEvaluationUseCase.ts",
    ),
    "utf8",
  );
  assertTruthy(
    source.includes("./RetrieveHybridKnowledgeChunksUseCase"),
    "must import RetrieveHybridKnowledgeChunksUseCase",
  );
  assertTruthy(
    source.includes("../evaluation/RetrievalEvaluator"),
    "must import RetrievalEvaluator port",
  );
  const forbidden = [
    "DefaultHybridSearch",
    "DefaultRetrievalEvaluator",
    "InMemoryVectorIndex",
    "../persistence",
    "../search/Default",
  ];
  for (const reference of forbidden) {
    assertTruthy(!source.includes(reference), `must not reference "${reference}"`);
  }
}

async function assertDelegatesPerCaseThenEvaluator(): Promise<void> {
  console.log(
    "[application] execute retrieves per case then delegates to RetrievalEvaluator...",
  );
  const retrieve = new FakeRetrieveHybrid();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunRetrievalEvaluationUseCase(
    retrieve as unknown as RetrieveHybridKnowledgeChunksUseCase,
    evaluator,
  );
  const dataset: EvaluationDataset = {
    id: "ds-1",
    cases: [
      {
        id: "c1",
        workspaceId: "ws-a",
        query: "hit",
        expectedChunkIds: ["expected"],
      },
      {
        id: "c2",
        workspaceId: "ws-b",
        query: "miss",
        expectedChunkIds: ["expected"],
      },
    ],
  };

  const metrics = await useCase.execute({ dataset, limit: 5 });
  assertEqual(retrieve.calls.length, 2, "two retrieve calls");
  assertEqual(retrieve.calls[0]?.workspaceId, "ws-a", "case1 workspace");
  assertEqual(retrieve.calls[0]?.limit, 5, "limit passed");
  assertEqual(retrieve.calls[1]?.query, "miss", "case2 query");
  assertTruthy(evaluator.lastInput !== null, "evaluator called");
  assertEqual(evaluator.lastInput?.retrievedByCaseId.size, 2, "map size");
  assertEqual(metrics.caseCount, 2, "metrics returned unchanged");
}

async function assertRejectsInvalidInputWithoutCalls(): Promise<void> {
  console.log(
    "[application] execute rejects invalid input without calling dependencies...",
  );
  const retrieve = new FakeRetrieveHybrid();
  const evaluator = new RecordingEvaluator();
  const useCase = new RunRetrievalEvaluationUseCase(
    retrieve as unknown as RetrieveHybridKnowledgeChunksUseCase,
    evaluator,
  );

  await assertRejects(
    useCase.execute({
      dataset: { id: "ds", cases: [] },
      limit: 3,
    }),
    "cases must not be empty",
  );
  await assertRejects(
    useCase.execute({
      dataset: {
        id: "ds",
        cases: [
          {
            id: "c1",
            workspaceId: "ws",
            query: "q",
            expectedChunkIds: [],
          },
        ],
      },
      limit: 0,
    } as RunRetrievalEvaluationInput),
    "limit must be a positive integer",
  );
  assertEqual(retrieve.calls.length, 0, "no retrieve");
  assertEqual(evaluator.lastInput, null, "no evaluate");
}

async function main(): Promise<void> {
  assertDependsOnlyOnPorts();
  await assertDelegatesPerCaseThenEvaluator();
  await assertRejectsInvalidInputWithoutCalls();
  console.log("RunRetrievalEvaluationUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
