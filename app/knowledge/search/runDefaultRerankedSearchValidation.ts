import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultRerankedSearch } from "./DefaultRerankedSearch";
import { DefaultHybridSearch } from "./DefaultHybridSearch";
import { DefaultKeywordSearch } from "./DefaultKeywordSearch";
import { DefaultReranker } from "./DefaultReranker";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { HybridSearch } from "./HybridSearch";
import type { Reranker } from "./Reranker";
import type { RerankingInput } from "./RerankingInput";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult, RetrievedChunk } from "../retrieval/RetrievalResult";

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

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real hybrid search. */
class CountingHybridSearch implements HybridSearch {
  public searchCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(
    private readonly inner: HybridSearch,
    private readonly callOrder: string[],
  ) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    this.searchCalls += 1;
    this.lastInput = input;
    this.callOrder.push("hybridSearch");
    return this.inner.search(input);
  }
}

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real reranker. */
class CountingReranker implements Reranker {
  public rerankCalls = 0;
  public lastInput: RerankingInput | null = null;

  constructor(
    private readonly inner: Reranker,
    private readonly callOrder: string[],
  ) {}

  async rerank(input: RerankingInput): Promise<RetrievedChunk[]> {
    this.rerankCalls += 1;
    this.lastInput = input;
    this.callOrder.push("reranker");
    return this.inner.rerank(input);
  }
}

/** Deterministically reverses whatever chunk order it is given, so a test can prove the caller forwards this exact order without re-sorting it again. */
class ReversingFakeReranker implements Reranker {
  async rerank(input: RerankingInput): Promise<RetrievedChunk[]> {
    return [...input.chunks].reverse();
  }
}

interface Harness {
  hybridSearch: DefaultHybridSearch;
  reranker: DefaultReranker;
  chunkRepository: DocumentChunkRepository;
  vectorIndex: InMemoryVectorIndex;
  embeddingProvider: FakeEmbeddingProvider;
}

function buildHarness(): Harness {
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const embeddingProvider = new FakeEmbeddingProvider();
  const vectorIndex = new InMemoryVectorIndex();
  const vectorRetriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    chunkRepository,
  );
  const keywordSearch = new DefaultKeywordSearch(chunkRepository);
  const hybridSearch = new DefaultHybridSearch(vectorRetriever, keywordSearch);
  const reranker = new DefaultReranker();
  return { hybridSearch, reranker, chunkRepository, vectorIndex, embeddingProvider };
}

async function seedChunkForBoth(
  harness: Harness,
  overrides: Partial<DocumentChunk> = {},
): Promise<DocumentChunk> {
  const seeded = chunk(overrides);
  const existing = await harness.chunkRepository.findByDocumentId(
    seeded.workspaceId,
    seeded.documentId,
  );
  await harness.chunkRepository.replaceForDocument(
    seeded.workspaceId,
    seeded.documentId,
    [...existing, seeded],
  );
  const vector = await harness.embeddingProvider.embed(seeded.text);
  await harness.vectorIndex.upsert({
    workspaceId: seeded.workspaceId,
    chunkId: seeded.id,
    vector,
  });
  return seeded;
}

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (RerankedSearch)...");
  const harness = buildHarness();
  const rerankedSearch = new DefaultRerankedSearch(harness.hybridSearch, harness.reranker);
  assertTruthy(typeof rerankedSearch.search === "function", "search must be defined");
}

async function assertSearchCallsHybridBeforeRerankerWithMappedInput(): Promise<void> {
  console.log("[search] search calls HybridSearch before Reranker, mapping RetrievalInput/RerankingInput fields correctly...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingHybridSearch = new CountingHybridSearch(harness.hybridSearch, callOrder);
  const countingReranker = new CountingReranker(harness.reranker, callOrder);
  const rerankedSearch = new DefaultRerankedSearch(countingHybridSearch, countingReranker);

  const seeded = await seedChunkForBoth(harness, { id: "chunk-1", text: "distinctivephrase" });
  const directHybridResult = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "distinctivephrase",
    limit: 10,
  });

  await rerankedSearch.search({
    workspaceId: WORKSPACE_A,
    query: "distinctivephrase",
    limit: 10,
  });

  assertEqual(countingHybridSearch.searchCalls, 1, "expected HybridSearch.search to be called exactly once");
  assertEqual(countingReranker.rerankCalls, 1, "expected Reranker.rerank to be called exactly once");
  assertEqual(callOrder.join(","), "hybridSearch,reranker", "expected HybridSearch to be called before Reranker");

  assertEqual(countingHybridSearch.lastInput?.workspaceId, WORKSPACE_A, "expected HybridSearch.search input.workspaceId to be the validated workspaceId");
  assertEqual(countingHybridSearch.lastInput?.query, "distinctivephrase", "expected HybridSearch.search input.query to be the validated query");
  assertEqual(countingHybridSearch.lastInput?.limit, 10, "expected HybridSearch.search input.limit to be the validated limit");

  assertEqual(countingReranker.lastInput?.workspaceId, WORKSPACE_A, "expected Reranker.rerank input.workspaceId to be the validated workspaceId");
  assertEqual(countingReranker.lastInput?.query, "distinctivephrase", "expected Reranker.rerank input.query to be the validated query");
  assertEqual(countingReranker.lastInput?.chunks.length, directHybridResult.chunks.length, "expected Reranker.rerank to receive exactly the HybridSearch result's own chunks");
  assertEqual(countingReranker.lastInput?.chunks[0]?.chunk.id, seeded.id, "expected Reranker.rerank to receive HybridSearch's own resolved chunk");
}

async function assertReturnedOrderMatchesRerankerOutputWithoutFurtherSorting(): Promise<void> {
  console.log("[search] search returns the reranker's own chunk order unchanged, never re-sorting it again...");
  const harness = buildHarness();
  await seedChunkForBoth(harness, { id: "chunk-a", documentId: "doc-a", text: "matchword" });
  await seedChunkForBoth(harness, { id: "chunk-b", documentId: "doc-b", text: "matchword" });
  await seedChunkForBoth(harness, { id: "chunk-c", documentId: "doc-c", text: "matchword" });

  const hybridResult = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "matchword",
    limit: 10,
  });
  assertEqual(hybridResult.chunks.length, 3, "expected all three seeded chunks to be found by hybrid search");

  // A reranker that deterministically reverses whatever order it is
  // given — proof that DefaultRerankedSearch forwards this exact
  // (reversed, not re-sorted-by-score) order as its own result.
  const rerankedSearch = new DefaultRerankedSearch(harness.hybridSearch, new ReversingFakeReranker());
  const result = await rerankedSearch.search({
    workspaceId: WORKSPACE_A,
    query: "matchword",
    limit: 10,
  });

  const expectedOrder = [...hybridResult.chunks].reverse().map((retrieved) => retrieved.chunk.id);
  assertEqual(result.chunks.length, 3, "expected every chunk to be present");
  assertEqual(
    result.chunks.map((retrieved) => retrieved.chunk.id).join(","),
    expectedOrder.join(","),
    "expected the returned chunk order to be exactly the reranker's own (reversed) order, not re-derived from hybrid search's own ranking",
  );
}

async function assertReturnsEmptyForEmptyHybridResult(): Promise<void> {
  console.log("[search] search returns an empty result when HybridSearch finds nothing, without erroring in the reranker...");
  const harness = buildHarness();
  const rerankedSearch = new DefaultRerankedSearch(harness.hybridSearch, harness.reranker);

  const result = await rerankedSearch.search({
    workspaceId: WORKSPACE_A,
    query: "nothing-matches-this-query",
    limit: 10,
  });

  assertEqual(result.chunks.length, 0, "expected an empty chunks array when hybrid search finds nothing");
}

async function assertRejectsInvalidInputWithoutCallingEitherDependency(): Promise<void> {
  console.log("[search] search rejects invalid workspaceId/query/limit input before calling either dependency...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingHybridSearch = new CountingHybridSearch(harness.hybridSearch, callOrder);
  const countingReranker = new CountingReranker(harness.reranker, callOrder);
  const rerankedSearch = new DefaultRerankedSearch(countingHybridSearch, countingReranker);

  await assertThrowsAsync(
    () => rerankedSearch.search({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrievalInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => rerankedSearch.search({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrievalInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => rerankedSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => rerankedSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: -1 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => rerankedSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1.5 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => rerankedSearch.search(null),
    "RetrievalInput must be an object",
  );

  assertEqual(countingHybridSearch.searchCalls, 0, "expected HybridSearch.search to never be called for invalid input");
  assertEqual(countingReranker.rerankCalls, 0, "expected Reranker.rerank to never be called for invalid input");
}

function assertDefaultRerankedSearchImportsOnlyPorts(): void {
  console.log("[search] DefaultRerankedSearch imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/DefaultRerankedSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "./HybridSearch"'),
    "DefaultRerankedSearch.ts must import the HybridSearch port",
  );
  assertTruthy(
    source.includes('from "./Reranker"'),
    "DefaultRerankedSearch.ts must import the Reranker port",
  );
  const forbiddenReferences = [
    "DefaultHybridSearch",
    "DefaultReranker",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "../persistence/",
    "../embedding/",
    "../repository/",
    "./KeywordSearch",
    "../retrieval/VectorRetriever",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultRerankedSearch.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertSearchCallsHybridBeforeRerankerWithMappedInput();
  await assertReturnedOrderMatchesRerankerOutputWithoutFurtherSorting();
  await assertReturnsEmptyForEmptyHybridResult();
  await assertRejectsInvalidInputWithoutCallingEitherDependency();
  assertDefaultRerankedSearchImportsOnlyPorts();
  console.log("DefaultRerankedSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
