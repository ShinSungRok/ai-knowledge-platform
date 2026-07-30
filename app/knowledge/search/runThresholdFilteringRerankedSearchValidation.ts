import { readFileSync } from "node:fs";
import path from "node:path";

import { ThresholdFilteringRerankedSearch } from "./ThresholdFilteringRerankedSearch";
import type { RerankedSearch } from "./RerankedSearch";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
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

/** Fixed-result Fake `RerankedSearch`, already sorted descending like a real reranked search would return. */
class FakeRerankedSearch implements RerankedSearch {
  public searchCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(private readonly result: RetrievalResult) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    this.searchCalls += 1;
    this.lastInput = input;
    return this.result;
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (RerankedSearch)...");
  const search = new ThresholdFilteringRerankedSearch(
    new FakeRerankedSearch({ query: "q", chunks: [] }),
    0,
  );
  assertTruthy(typeof search.search === "function", "search must be defined");
}

async function assertConstructorRejectsNonFiniteMinScore(): Promise<void> {
  console.log("[search] constructor rejects a non-finite minScore...");
  const inner = new FakeRerankedSearch({ query: "q", chunks: [] });
  assertTruthy(
    (() => {
      try {
        new ThresholdFilteringRerankedSearch(inner, Number.NaN);
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
  console.log("[search] search drops candidates scoring below minScore, keeping the rest...");
  const inner = new FakeRerankedSearch({
    query: "q",
    chunks: [
      { chunk: chunk({ id: "chunk-high" }), score: 0.8 },
      { chunk: chunk({ id: "chunk-mid" }), score: 0.5 },
      { chunk: chunk({ id: "chunk-low" }), score: 0.05 },
    ],
  });
  const search = new ThresholdFilteringRerankedSearch(inner, 0.1);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(result.chunks.length, 2, "expected only the two candidates at/above minScore to survive");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-high", "expected chunk-high to survive, in its original order");
  assertEqual(result.chunks[1]?.chunk.id, "chunk-mid", "expected chunk-mid to survive, in its original order");
}

async function assertKeepsChunksExactlyAtMinScore(): Promise<void> {
  console.log("[search] search keeps a candidate whose score is exactly minScore (inclusive boundary)...");
  const inner = new FakeRerankedSearch({
    query: "q",
    chunks: [{ chunk: chunk({ id: "chunk-boundary" }), score: 0.1 }],
  });
  const search = new ThresholdFilteringRerankedSearch(inner, 0.1);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(result.chunks.length, 1, "expected the boundary-score candidate to be kept (>=, not >)");
}

async function assertReturnsEmptyWhenEveryCandidateIsBelowMinScore(): Promise<void> {
  console.log("[search] search yields an empty chunk list when every candidate scores below minScore (feeds insufficientEvidence downstream)...");
  const inner = new FakeRerankedSearch({
    query: "irrelevant question",
    chunks: [
      { chunk: chunk({ id: "chunk-a" }), score: 0.01 },
      { chunk: chunk({ id: "chunk-b" }), score: 0.02 },
    ],
  });
  const search = new ThresholdFilteringRerankedSearch(inner, 0.1);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "irrelevant question", limit: 10 });

  assertEqual(result.chunks.length, 0, "expected an empty chunks array when nothing clears the threshold");
  assertEqual(result.query, "irrelevant question", "expected the inner search's own query to be preserved");
}

async function assertNeverResortsTheInnerResult(): Promise<void> {
  console.log("[search] search preserves the inner search's own order, never re-sorting...");
  const inner = new FakeRerankedSearch({
    query: "q",
    chunks: [
      { chunk: chunk({ id: "chunk-z" }), score: 0.9 },
      { chunk: chunk({ id: "chunk-a" }), score: 0.8 },
    ],
  });
  const search = new ThresholdFilteringRerankedSearch(inner, 0);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 10 });

  assertEqual(
    result.chunks.map((c) => c.chunk.id).join(","),
    "chunk-z,chunk-a",
    "expected the exact incoming order to be preserved, even though it is not score-descending",
  );
}

async function assertForwardsInputToInnerSearchUnchanged(): Promise<void> {
  console.log("[search] search forwards the exact RetrievalInput to the inner search...");
  const inner = new FakeRerankedSearch({ query: "q", chunks: [] });
  const search = new ThresholdFilteringRerankedSearch(inner, 0);

  await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 7 });

  assertEqual(inner.searchCalls, 1, "expected the inner search to be called exactly once");
  assertEqual(inner.lastInput?.workspaceId, WORKSPACE_A, "expected workspaceId to be forwarded unchanged");
  assertEqual(inner.lastInput?.query, "q", "expected query to be forwarded unchanged");
  assertEqual(inner.lastInput?.limit, 7, "expected limit to be forwarded unchanged");
}

async function assertPropagatesInnerSearchErrors(): Promise<void> {
  console.log("[search] search propagates an error thrown by the inner search...");
  class ThrowingRerankedSearch implements RerankedSearch {
    async search(): Promise<RetrievalResult> {
      throw new Error("inner search failed");
    }
  }
  const search = new ThresholdFilteringRerankedSearch(new ThrowingRerankedSearch(), 0);

  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1 }),
    "inner search failed",
  );
}

function assertThresholdFilteringRerankedSearchImportsOnlyPorts(): void {
  console.log("[search] ThresholdFilteringRerankedSearch imports only the RerankedSearch port, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/ThresholdFilteringRerankedSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "./RerankedSearch"'),
    "ThresholdFilteringRerankedSearch.ts must import the RerankedSearch port",
  );
  const forbiddenReferences = [
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "NormalizedReranker",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "../persistence",
    "../embedding",
    "../repository",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ThresholdFilteringRerankedSearch.ts must not reference "${reference}"`,
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
  await assertForwardsInputToInnerSearchUnchanged();
  await assertPropagatesInnerSearchErrors();
  assertThresholdFilteringRerankedSearchImportsOnlyPorts();
  console.log("ThresholdFilteringRerankedSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
