import { readFileSync } from "node:fs";
import path from "node:path";

import { ThresholdFilteringKeywordSearch } from "./ThresholdFilteringKeywordSearch";
import type { KeywordSearch } from "./KeywordSearch";
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

class FakeKeywordSearch implements KeywordSearch {
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
  console.log("[search] port contract (KeywordSearch)...");
  const search = new ThresholdFilteringKeywordSearch(
    new FakeKeywordSearch({ query: "q", chunks: [] }),
    0,
  );
  assertTruthy(typeof search.search === "function", "search must be defined");
}

async function assertConstructorRejectsInvalidMinCoverage(): Promise<void> {
  console.log("[search] constructor rejects a minCoverage outside 0..1...");
  const inner = new FakeKeywordSearch({ query: "q", chunks: [] });
  for (const bad of [Number.NaN, -0.1, 1.1]) {
    assertTruthy(
      (() => {
        try {
          new ThresholdFilteringKeywordSearch(inner, bad);
          return false;
        } catch (error) {
          return (
            error instanceof Error &&
            error.message.includes("minCoverage must be a number between 0 and 1")
          );
        }
      })(),
      `expected constructor to reject minCoverage=${bad}`,
    );
  }
}

async function assertDropsAnIncidentalSingleTokenMatch(): Promise<void> {
  console.log("[search] search drops a candidate matching only one of many query tokens (incidental overlap)...");
  const inner = new FakeKeywordSearch({
    query: "제1조 이후에 넷플릭스 추천 좀 해줘",
    chunks: [
      {
        chunk: chunk({
          id: "chunk-incidental",
          text: "제1조(목적) 이 법은 근로조건의 최저기준을 정함으로써 근로자의 기본적 생활을 보장한다.",
        }),
        score: 1,
      },
    ],
  });
  const search = new ThresholdFilteringKeywordSearch(inner, 0.3);

  const result = await search.search({
    workspaceId: WORKSPACE_A,
    query: "제1조 이후에 넷플릭스 추천 좀 해줘",
    limit: 10,
  });

  assertEqual(result.chunks.length, 0, "expected the single-token incidental match to be dropped (coverage=1/6 < 0.3)");
}

async function assertKeepsACandidateWithSubstantialCoverage(): Promise<void> {
  console.log("[search] search keeps a candidate that shares a substantial fraction of query tokens...");
  const inner = new FakeKeywordSearch({
    query: "여성 근로자 생리휴가 며칠",
    chunks: [
      {
        chunk: chunk({
          id: "chunk-substantial",
          text: "제73조(생리휴가) 사용자는 여성 근로자가 청구하면 월 1일의 생리휴가를 주어야 한다.",
        }),
        score: 3,
      },
    ],
  });
  const search = new ThresholdFilteringKeywordSearch(inner, 0.3);

  const result = await search.search({
    workspaceId: WORKSPACE_A,
    query: "여성 근로자 생리휴가 며칠",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected the substantially-overlapping candidate to survive (coverage=3/4)");
}

async function assertKeepsChunksExactlyAtMinCoverage(): Promise<void> {
  console.log("[search] search keeps a candidate whose coverage is exactly minCoverage (inclusive boundary)...");
  const inner = new FakeKeywordSearch({
    query: "alpha beta gamma",
    chunks: [{ chunk: chunk({ id: "chunk-boundary", text: "alpha filler filler" }), score: 1 }],
  });
  const search = new ThresholdFilteringKeywordSearch(inner, 1 / 3);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "alpha beta gamma", limit: 10 });

  assertEqual(result.chunks.length, 1, "expected the boundary-coverage candidate to be kept (>=, not >)");
}

async function assertNeverResortsTheInnerResult(): Promise<void> {
  console.log("[search] search preserves the inner search's own order, never re-sorting...");
  const inner = new FakeKeywordSearch({
    query: "alpha",
    chunks: [
      { chunk: chunk({ id: "chunk-z", text: "alpha" }), score: 2 },
      { chunk: chunk({ id: "chunk-a", text: "alpha" }), score: 1 },
    ],
  });
  const search = new ThresholdFilteringKeywordSearch(inner, 0);

  const result = await search.search({ workspaceId: WORKSPACE_A, query: "alpha", limit: 10 });

  assertEqual(
    result.chunks.map((c) => c.chunk.id).join(","),
    "chunk-z,chunk-a",
    "expected the exact incoming order to be preserved",
  );
}

async function assertForwardsInputToInnerSearchUnchanged(): Promise<void> {
  console.log("[search] search forwards the exact RetrievalInput to the inner search...");
  const inner = new FakeKeywordSearch({ query: "q", chunks: [] });
  const search = new ThresholdFilteringKeywordSearch(inner, 0);

  await search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 7 });

  assertEqual(inner.searchCalls, 1, "expected the inner search to be called exactly once");
  assertEqual(inner.lastInput?.workspaceId, WORKSPACE_A, "expected workspaceId to be forwarded unchanged");
  assertEqual(inner.lastInput?.query, "q", "expected query to be forwarded unchanged");
  assertEqual(inner.lastInput?.limit, 7, "expected limit to be forwarded unchanged");
}

async function assertPropagatesInnerSearchErrors(): Promise<void> {
  console.log("[search] search propagates an error thrown by the inner search...");
  class ThrowingKeywordSearch implements KeywordSearch {
    async search(): Promise<RetrievalResult> {
      throw new Error("inner search failed");
    }
  }
  const search = new ThresholdFilteringKeywordSearch(new ThrowingKeywordSearch(), 0);

  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1 }),
    "inner search failed",
  );
}

function assertThresholdFilteringKeywordSearchImportsOnlyPorts(): void {
  console.log("[search] ThresholdFilteringKeywordSearch imports only the KeywordSearch port/tokenize utility, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/ThresholdFilteringKeywordSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "./KeywordSearch"'),
    "ThresholdFilteringKeywordSearch.ts must import the KeywordSearch port",
  );
  const forbiddenReferences = [
    "DefaultKeywordSearch",
    "DefaultReranker",
    "NormalizedReranker",
    "DefaultVectorRetriever",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "../persistence",
    "../embedding",
    "../repository",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ThresholdFilteringKeywordSearch.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertConstructorRejectsInvalidMinCoverage();
  await assertDropsAnIncidentalSingleTokenMatch();
  await assertKeepsACandidateWithSubstantialCoverage();
  await assertKeepsChunksExactlyAtMinCoverage();
  await assertNeverResortsTheInnerResult();
  await assertForwardsInputToInnerSearchUnchanged();
  await assertPropagatesInnerSearchErrors();
  assertThresholdFilteringKeywordSearchImportsOnlyPorts();
  console.log("ThresholdFilteringKeywordSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
