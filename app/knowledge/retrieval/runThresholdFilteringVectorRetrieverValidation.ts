import { readFileSync } from "node:fs";
import path from "node:path";

import { ThresholdFilteringVectorRetriever } from "./ThresholdFilteringVectorRetriever";
import type { VectorRetriever } from "./VectorRetriever";
import type { RetrievalInput } from "./RetrievalInput";
import type { RetrievalResult } from "./RetrievalResult";
import type { DocumentChunk } from "../domain/DocumentChunk";

const WORKSPACE_A = "workspace-a";

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

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected async throw containing: ${messageSubstring}`);
}

function chunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: "doc-1",
    text: "body",
    order: 0,
    ...overrides,
  };
}

/** Fixed-result Fake `VectorRetriever`, already sorted descending like a real vector retriever would return. */
class FakeVectorRetriever implements VectorRetriever {
  public retrieveCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(private readonly result: RetrievalResult) {}

  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    this.retrieveCalls += 1;
    this.lastInput = input;
    return this.result;
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[retrieval] port contract (VectorRetriever)...");
  const retriever = new ThresholdFilteringVectorRetriever(
    new FakeVectorRetriever({ query: "q", chunks: [] }),
    0,
  );
  assertTruthy(typeof retriever.retrieve === "function", "retrieve must be defined");
}

async function assertConstructorRejectsNonFiniteMinScore(): Promise<void> {
  console.log("[retrieval] constructor rejects a non-finite minScore...");
  const inner = new FakeVectorRetriever({ query: "q", chunks: [] });
  assertTruthy(
    (() => {
      try {
        new ThresholdFilteringVectorRetriever(inner, Number.NaN);
        return false;
      } catch (error) {
        return (
          error instanceof Error &&
          error.message.includes("minScore must be a finite number")
        );
      }
    })(),
    "expected constructor to reject NaN minScore",
  );
}

async function assertFiltersOutChunksBelowMinScore(): Promise<void> {
  console.log("[retrieval] retrieve drops candidates scoring below minScore, keeping the rest...");
  const inner = new FakeVectorRetriever({
    query: "q",
    chunks: [
      { chunk: chunk({ id: "chunk-high" }), score: 0.7 },
      { chunk: chunk({ id: "chunk-mid" }), score: 0.2 },
      { chunk: chunk({ id: "chunk-low" }), score: 0.05 },
    ],
  });
  const retriever = new ThresholdFilteringVectorRetriever(inner, 0.15);

  const result = await retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(result.chunks.length, 2, "expected only the two candidates at/above minScore to survive");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-high", "expected chunk-high to survive, in its original order");
  assertEqual(result.chunks[1]?.chunk.id, "chunk-mid", "expected chunk-mid to survive, in its original order");
}

async function assertKeepsChunksExactlyAtMinScore(): Promise<void> {
  console.log("[retrieval] retrieve keeps a candidate whose score is exactly minScore (inclusive boundary)...");
  const inner = new FakeVectorRetriever({
    query: "q",
    chunks: [{ chunk: chunk({ id: "chunk-boundary" }), score: 0.15 }],
  });
  const retriever = new ThresholdFilteringVectorRetriever(inner, 0.15);

  const result = await retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(result.chunks.length, 1, "expected the boundary-score candidate to be kept (>=, not >)");
}

async function assertReturnsEmptyWhenEveryCandidateIsBelowMinScore(): Promise<void> {
  console.log("[retrieval] retrieve yields an empty chunk list when every candidate scores below minScore, so a genuinely unrelated query never fakes a match downstream...");
  const inner = new FakeVectorRetriever({
    query: "irrelevant question",
    chunks: [
      { chunk: chunk({ id: "chunk-a" }), score: 0.09 },
      { chunk: chunk({ id: "chunk-b" }), score: 0.05 },
    ],
  });
  const retriever = new ThresholdFilteringVectorRetriever(inner, 0.15);

  const result = await retriever.retrieve({ workspaceId: WORKSPACE_A, query: "irrelevant question", limit: 10 });

  assertEqual(result.chunks.length, 0, "expected an empty chunks array when nothing clears the threshold");
  assertEqual(result.query, "irrelevant question", "expected the inner retriever's own query to be preserved");
}

async function assertNeverResortsTheInnerResult(): Promise<void> {
  console.log("[retrieval] retrieve preserves the inner retriever's own order, never re-sorting...");
  const inner = new FakeVectorRetriever({
    query: "q",
    chunks: [
      { chunk: chunk({ id: "chunk-z" }), score: 0.9 },
      { chunk: chunk({ id: "chunk-a" }), score: 0.8 },
    ],
  });
  const retriever = new ThresholdFilteringVectorRetriever(inner, 0);

  const result = await retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(
    result.chunks.map((c) => c.chunk.id).join(","),
    "chunk-z,chunk-a",
    "expected the exact incoming order to be preserved, even though it is not score-descending",
  );
}

async function assertForwardsInputToInnerRetrieverUnchanged(): Promise<void> {
  console.log("[retrieval] retrieve forwards the exact RetrievalInput to the inner retriever...");
  const inner = new FakeVectorRetriever({ query: "q", chunks: [] });
  const retriever = new ThresholdFilteringVectorRetriever(inner, 0);

  await retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 7 });

  assertEqual(inner.retrieveCalls, 1, "expected the inner retriever to be called exactly once");
  assertEqual(inner.lastInput?.workspaceId, WORKSPACE_A, "expected workspaceId to be forwarded unchanged");
  assertEqual(inner.lastInput?.query, "q", "expected query to be forwarded unchanged");
  assertEqual(inner.lastInput?.limit, 7, "expected limit to be forwarded unchanged");
}

async function assertPropagatesInnerRetrieverErrors(): Promise<void> {
  console.log("[retrieval] retrieve propagates an error thrown by the inner retriever...");
  class ThrowingVectorRetriever implements VectorRetriever {
    async retrieve(): Promise<RetrievalResult> {
      throw new Error("inner retriever failed");
    }
  }
  const retriever = new ThresholdFilteringVectorRetriever(new ThrowingVectorRetriever(), 0);

  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 1 }),
    "inner retriever failed",
  );
}

function assertThresholdFilteringVectorRetrieverImportsOnlyPorts(): void {
  console.log("[retrieval] ThresholdFilteringVectorRetriever imports only the VectorRetriever port, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/retrieval/ThresholdFilteringVectorRetriever.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "./VectorRetriever"'),
    "ThresholdFilteringVectorRetriever.ts must import the VectorRetriever port",
  );
  const forbiddenReferences = [
    "DefaultVectorRetriever",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "../persistence",
    "../embedding",
    "../repository",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ThresholdFilteringVectorRetriever.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertConstructorRejectsNonFiniteMinScore();
  await assertFiltersOutChunksBelowMinScore();
  await assertKeepsChunksExactlyAtMinScore();
  await assertReturnsEmptyWhenEveryCandidateIsBelowMinScore();
  await assertNeverResortsTheInnerResult();
  await assertForwardsInputToInnerRetrieverUnchanged();
  await assertPropagatesInnerRetrieverErrors();
  assertThresholdFilteringVectorRetrieverImportsOnlyPorts();
  console.log("ThresholdFilteringVectorRetriever validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
