import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultKeywordSearch } from "./DefaultKeywordSearch";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KeywordSearch } from "./KeywordSearch";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

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

interface Harness {
  search: KeywordSearch;
  chunkRepository: DocumentChunkRepository;
}

function buildHarness(): Harness {
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const search = new DefaultKeywordSearch(chunkRepository);
  return { search, chunkRepository };
}

async function seedChunk(
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

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (KeywordSearch)...");
  const { search } = buildHarness();
  assertTruthy(typeof search.search === "function", "search must be defined");
}

async function assertSearchRanksByExactTokenMatchCount(): Promise<void> {
  console.log("[search] search scores chunks by summed exact query-token match counts, best match first...");
  const harness = buildHarness();
  const bestMatch = await seedChunk(harness, {
    id: "best-match",
    text: "the quick brown fox jumps over the quick fox",
  });
  const partialMatch = await seedChunk(harness, {
    id: "partial-match",
    documentId: "doc-2",
    text: "a quick nap in the afternoon",
  });
  await seedChunk(harness, {
    id: "no-match",
    documentId: "doc-3",
    text: "completely unrelated sentence",
  });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "quick fox",
    limit: 10,
  });

  assertEqual(result.query, "quick fox", "result.query mismatch");
  assertEqual(result.chunks.length, 2, "expected only chunks with a positive score");
  assertEqual(result.chunks[0]?.chunk.id, bestMatch.id, "expected the chunk with more exact token matches to rank first");
  assertEqual(result.chunks[0]?.score, 4, "expected score = 2 (quick) + 2 (fox) = 4");
  assertEqual(result.chunks[1]?.chunk.id, partialMatch.id, "expected the single-token match to rank second");
  assertEqual(result.chunks[1]?.score, 1, "expected score = 1 (quick) + 0 (fox) = 1");
}

async function assertSearchIsCaseInsensitive(): Promise<void> {
  console.log("[search] search matches tokens case-insensitively...");
  const harness = buildHarness();
  const seeded = await seedChunk(harness, { text: "The Quick Brown FOX" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "quick FOX",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected a case-insensitive match");
  assertEqual(result.chunks[0]?.chunk.id, seeded.id, "expected the seeded chunk to match regardless of case");
  assertEqual(result.chunks[0]?.score, 2, "expected both query tokens to match once each");
}

async function assertSearchIgnoresDuplicateQueryTokens(): Promise<void> {
  console.log("[search] search de-duplicates query tokens before scoring...");
  const harness = buildHarness();
  const seeded = await seedChunk(harness, { text: "fox fox fox" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "fox fox fox fox",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected a single matching chunk");
  assertEqual(
    result.chunks[0]?.score,
    3,
    "expected the score to count each occurrence of the unique token 'fox' in the chunk, unaffected by query-side duplicates",
  );
}

async function assertSearchExcludesZeroScoreChunks(): Promise<void> {
  console.log("[search] search excludes chunks with a zero score...");
  const harness = buildHarness();
  await seedChunk(harness, { id: "no-match", text: "totally different words" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "unrelated-term",
    limit: 10,
  });

  assertEqual(result.chunks.length, 0, "expected no chunks with a zero score");
}

async function assertSearchBreaksScoreTiesByChunkIdAscending(): Promise<void> {
  console.log("[search] search breaks equal-score ties by chunk id ascending...");
  const harness = buildHarness();
  await seedChunk(harness, { id: "chunk-z", documentId: "doc-z", text: "match" });
  await seedChunk(harness, { id: "chunk-a", documentId: "doc-a", text: "match" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "match",
    limit: 10,
  });

  assertEqual(result.chunks.length, 2, "expected both equally-scored chunks");
  assertEqual(result.chunks[0]?.chunk.id, "chunk-a", "expected the lexicographically smaller id to rank first on a tie");
  assertEqual(result.chunks[1]?.chunk.id, "chunk-z", "expected the lexicographically larger id to rank second on a tie");
}

async function assertSearchRespectsLimit(): Promise<void> {
  console.log("[search] search returns at most limit chunks...");
  const harness = buildHarness();
  await seedChunk(harness, { id: "chunk-1", text: "match" });
  await seedChunk(harness, { id: "chunk-2", documentId: "doc-2", text: "match" });
  await seedChunk(harness, { id: "chunk-3", documentId: "doc-3", text: "match" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "match",
    limit: 2,
  });

  assertEqual(result.chunks.length, 2, "expected search to truncate to the requested limit");
}

async function assertSearchIsolatesByWorkspace(): Promise<void> {
  console.log("[search] search only ranks chunks within the requested workspace...");
  const harness = buildHarness();
  await seedChunk(harness, { workspaceId: WORKSPACE_A, id: "a-chunk", text: "match" });
  await seedChunk(harness, { workspaceId: WORKSPACE_B, id: "b-chunk", documentId: "doc-b", text: "match" });

  const result = await harness.search.search({
    workspaceId: WORKSPACE_A,
    query: "match",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected only workspace A's chunk to be ranked");
  assertEqual(result.chunks[0]?.chunk.id, "a-chunk", "expected workspace A's own chunk");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[search] search rejects invalid workspaceId/query/limit input...");
  const { search } = buildHarness();

  await assertThrowsAsync(
    () => search.search({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrievalInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrievalInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: "q", limit: -1 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => search.search({ workspaceId: WORKSPACE_A, query: "q", limit: 1.5 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => search.search(null),
    "RetrievalInput must be an object",
  );
}

function assertDefaultKeywordSearchImportsOnlyPorts(): void {
  console.log("[search] DefaultKeywordSearch imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/DefaultKeywordSearch.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultInMemoryDocumentChunkRepository",
    "InMemoryVectorIndex",
    "FakeEmbeddingProvider",
    "../persistence",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultKeywordSearch.ts must not reference concrete adapter "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertSearchRanksByExactTokenMatchCount();
  await assertSearchIsCaseInsensitive();
  await assertSearchIgnoresDuplicateQueryTokens();
  await assertSearchExcludesZeroScoreChunks();
  await assertSearchBreaksScoreTiesByChunkIdAscending();
  await assertSearchRespectsLimit();
  await assertSearchIsolatesByWorkspace();
  await assertRejectsInvalidInput();
  assertDefaultKeywordSearchImportsOnlyPorts();
  console.log("DefaultKeywordSearch validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
