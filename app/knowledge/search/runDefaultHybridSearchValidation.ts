import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultHybridSearch } from "./DefaultHybridSearch";
import { DefaultKeywordSearch } from "./DefaultKeywordSearch";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { HybridSearch } from "./HybridSearch";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const RRF_K = 60;

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

function assertClose(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(
      `${message} (actual=${actual}, expected=${expected})`,
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

interface Harness {
  hybridSearch: HybridSearch;
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
  return { hybridSearch, chunkRepository, vectorIndex, embeddingProvider };
}

/** Seeds a chunk in the repository only — discoverable by keyword search, not vector search. */
async function seedChunkForKeywordOnly(
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
  return seeded;
}

/** Seeds a chunk plus its embedding vector — discoverable by both keyword and vector search. */
async function seedChunkForBoth(
  harness: Harness,
  overrides: Partial<DocumentChunk> = {},
): Promise<DocumentChunk> {
  const seeded = await seedChunkForKeywordOnly(harness, overrides);
  const vector = await harness.embeddingProvider.embed(seeded.text);
  await harness.vectorIndex.upsert({
    workspaceId: seeded.workspaceId,
    chunkId: seeded.id,
    vector,
  });
  return seeded;
}

function rrf(rank: number): number {
  return 1 / (RRF_K + rank);
}

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (HybridSearch)...");
  const { hybridSearch } = buildHarness();
  assertTruthy(typeof hybridSearch.search === "function", "search must be defined");
}

async function assertVectorOnlyResultIsFused(): Promise<void> {
  console.log("[search] search fuses a vector-only result with just its vector-side reciprocal rank...");
  const harness = buildHarness();
  // "wwwwwwww" and "zzzzzzzz" are both 8 same-character strings, so
  // FakeEmbeddingProvider gives each an all-equal-valued vector — cosine
  // similarity between any two such vectors is exactly 1.0 (a perfect
  // vector match) even though the two words share zero tokens, so
  // keyword search cannot match this chunk at all.
  const vectorMatch = await seedChunkForBoth(harness, { id: "vector-match", text: "wwwwwwww" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "zzzzzzzz",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected only the vector-matched chunk to be present");
  assertEqual(result.chunks[0]?.chunk.id, vectorMatch.id, "expected the vector-matched chunk");
  assertClose(result.chunks[0]!.score, rrf(1), "expected the vector-only chunk's score to be exactly its vector-side RRF contribution");
}

async function assertKeywordOnlyResultIsFused(): Promise<void> {
  console.log("[search] search fuses a keyword-only result (no matching embedding) with just its keyword-side reciprocal rank...");
  const harness = buildHarness();
  // Seeded without an embedding vector, so vector retrieval cannot find it,
  // but its text is still discoverable by keyword search.
  const keywordMatch = await seedChunkForKeywordOnly(harness, {
    id: "keyword-only",
    text: "uniqueword",
  });
  // Seed an unrelated chunk with an embedding so the vector index is non-empty
  // but has nothing relevant to this query.
  await seedChunkForBoth(harness, { id: "irrelevant-vector", documentId: "doc-2", text: "aaaaaaaa" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "uniqueword",
    limit: 10,
  });

  const match = result.chunks.find((c) => c.chunk.id === keywordMatch.id);
  assertTruthy(match, "expected the keyword-only chunk to be present in the fused result");
  assertClose(match!.score, rrf(1), "expected the keyword-only chunk's score to be exactly its keyword-side RRF contribution");
}

async function assertOverlappingResultsAreMergedAndFused(): Promise<void> {
  console.log("[search] search merges a chunk present in both vector and keyword results into one entry, summing both RRF contributions...");
  const harness = buildHarness();
  const overlapping = await seedChunkForBoth(harness, { id: "overlap-chunk", text: "distinctive" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "distinctive",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected exactly one merged entry, not two");
  assertEqual(result.chunks[0]?.chunk.id, overlapping.id, "expected the overlapping chunk");
  assertClose(
    result.chunks[0]!.score,
    rrf(1) + rrf(1),
    "expected the fused score to sum the rank-1 RRF contribution from both sources",
  );
}

async function assertFusedRankingOrdersByCombinedScoreDescending(): Promise<void> {
  console.log("[search] search ranks by combined RRF score descending: a chunk found by both sources outranks a chunk found by only one...");
  const harness = buildHarness();
  const inBoth = await seedChunkForBoth(harness, { id: "in-both", text: "shared common phrase" });
  const keywordOnly = await seedChunkForKeywordOnly(harness, {
    id: "keyword-side-only",
    documentId: "doc-2",
    text: "shared common phrase but distinct",
  });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "shared common phrase",
    limit: 10,
  });

  const inBothIndex = result.chunks.findIndex((c) => c.chunk.id === inBoth.id);
  const keywordOnlyIndex = result.chunks.findIndex((c) => c.chunk.id === keywordOnly.id);
  assertTruthy(inBothIndex !== -1, "expected the dual-source chunk to be present");
  assertTruthy(keywordOnlyIndex !== -1, "expected the keyword-only chunk to be present");
  assertTruthy(
    inBothIndex < keywordOnlyIndex,
    "expected the chunk found by both sources to rank ahead of the chunk found by only one",
  );
}

async function assertDeterministicTieBreakByChunkIdAscending(): Promise<void> {
  console.log("[search] search breaks equal fused-score ties by chunk id ascending...");
  const harness = buildHarness();
  // "chunk-a" is vector-only: same-repeated-character text ("wwwwwwww")
  // gives it a perfect (1.0) cosine similarity to the "zzzzzzzz" query
  // (see assertVectorOnlyResultIsFused), landing at vector rank 1 — but it
  // shares no token with the query, so keyword search never finds it.
  // "chunk-z" is keyword-only: its text is the query itself, so it lands
  // at keyword rank 1 — but it is never embedded/upserted, so vector
  // search never finds it. Both therefore fuse to the exact same score
  // (rank-1 from exactly one source each), isolating the id tie-break.
  await seedChunkForBoth(harness, { id: "chunk-a", documentId: "doc-a", text: "wwwwwwww" });
  await seedChunkForKeywordOnly(harness, { id: "chunk-z", documentId: "doc-z", text: "zzzzzzzz" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "zzzzzzzz",
    limit: 10,
  });

  assertEqual(result.chunks.length, 2, "expected both equally-scored chunks");
  assertClose(result.chunks[0]!.score, result.chunks[1]!.score, "expected both chunks to have the same fused score");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-a", "expected the lexicographically smaller id to rank first on a tie");
  assertEqual(result.chunks[1]?.chunk.id, "chunk-z", "expected the lexicographically larger id to rank second on a tie");
}

async function assertWorkspacePassesThroughToBothSources(): Promise<void> {
  console.log("[search] search passes workspaceId through to both sources, isolating results per workspace...");
  const harness = buildHarness();
  await seedChunkForBoth(harness, { workspaceId: WORKSPACE_A, id: "a-chunk", text: "isolated" });
  await seedChunkForBoth(harness, { workspaceId: WORKSPACE_B, id: "b-chunk", documentId: "doc-b", text: "isolated" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "isolated",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected only workspace A's chunk to be present");
  assertEqual(result.chunks[0]?.chunk.id, "a-chunk", "expected workspace A's own chunk");
}

async function assertSearchRespectsLimit(): Promise<void> {
  console.log("[search] search returns at most limit fused chunks...");
  const harness = buildHarness();
  await seedChunkForBoth(harness, { id: "chunk-1", text: "matchword" });
  await seedChunkForBoth(harness, { id: "chunk-2", documentId: "doc-2", text: "matchword" });
  await seedChunkForBoth(harness, { id: "chunk-3", documentId: "doc-3", text: "matchword" });

  const result = await harness.hybridSearch.search({
    workspaceId: WORKSPACE_A,
    query: "matchword",
    limit: 2,
  });

  assertEqual(result.chunks.length, 2, "expected search to truncate to the requested limit");
}

async function assertRejectsInvalidInputWithoutCallingEitherSource(): Promise<void> {
  console.log("[search] search rejects invalid workspaceId/query/limit input before calling either dependency...");

  let vectorCalls = 0;
  let keywordCalls = 0;
  const countingVectorRetriever = {
    async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
      vectorCalls += 1;
      return { query: input.query, chunks: [] };
    },
  };
  const countingKeywordSearch = {
    async search(input: RetrievalInput): Promise<RetrievalResult> {
      keywordCalls += 1;
      return { query: input.query, chunks: [] };
    },
  };
  const hybridSearch = new DefaultHybridSearch(countingVectorRetriever, countingKeywordSearch);

  await assertThrowsAsync(
    () => hybridSearch.search({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrievalInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => hybridSearch.search({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrievalInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => hybridSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => hybridSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: -1 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => hybridSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1.5 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => hybridSearch.search(null),
    "RetrievalInput must be an object",
  );

  assertEqual(vectorCalls, 0, "expected VectorRetriever.retrieve to never be called for invalid input");
  assertEqual(keywordCalls, 0, "expected KeywordSearch.search to never be called for invalid input");

  // Confirm the same harness still succeeds for valid input, proving the
  // rejections above were input-validation failures, not a broken harness.
  await hybridSearch.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1 });
  assertEqual(vectorCalls, 1, "expected exactly one VectorRetriever.retrieve call for valid input");
  assertEqual(keywordCalls, 1, "expected exactly one KeywordSearch.search call for valid input");
}

function assertDefaultHybridSearchImportsOnlyPorts(): void {
  console.log("[search] DefaultHybridSearch imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/DefaultHybridSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultInMemoryDocumentChunkRepository",
    "InMemoryVectorIndex",
    "FakeEmbeddingProvider",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "../persistence",
    "../embedding/InMemoryVectorIndex",
    "../embedding/FakeEmbeddingProvider",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultHybridSearch.ts must not reference concrete adapter "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertVectorOnlyResultIsFused();
  await assertKeywordOnlyResultIsFused();
  await assertOverlappingResultsAreMergedAndFused();
  await assertFusedRankingOrdersByCombinedScoreDescending();
  await assertDeterministicTieBreakByChunkIdAscending();
  await assertWorkspacePassesThroughToBothSources();
  await assertSearchRespectsLimit();
  await assertRejectsInvalidInputWithoutCallingEitherSource();
  assertDefaultHybridSearchImportsOnlyPorts();
  console.log("DefaultHybridSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
