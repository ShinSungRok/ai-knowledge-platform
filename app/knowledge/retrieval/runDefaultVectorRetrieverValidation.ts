import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultVectorRetriever } from "./DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { VectorRetriever } from "./VectorRetriever";

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
    text: "aaaaaaaa",
    order: 0,
    ...overrides,
  };
}

interface Harness {
  retriever: VectorRetriever;
  embeddingProvider: EmbeddingProvider;
  vectorIndex: VectorIndex;
  chunkRepository: DocumentChunkRepository;
}

function buildHarness(): Harness {
  const embeddingProvider = new FakeEmbeddingProvider();
  const vectorIndex = new InMemoryVectorIndex();
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const retriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    chunkRepository,
  );
  return { retriever, embeddingProvider, vectorIndex, chunkRepository };
}

/** Seeds a chunk plus its embedding vector, so `findNearest` can find it. */
async function seedChunk(
  harness: Harness,
  overrides: Partial<DocumentChunk> = {},
): Promise<DocumentChunk> {
  const seeded = chunk(overrides);
  await harness.chunkRepository.replaceForDocument(
    seeded.workspaceId,
    seeded.documentId,
    [seeded],
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
  console.log("[retrieval] port contract (VectorRetriever)...");
  const { retriever } = buildHarness();
  assertTruthy(typeof retriever.retrieve === "function", "retrieve must be defined");
}

async function assertRetrieveEmbedsQueryAndHydratesNearestChunks(): Promise<void> {
  console.log("[retrieval] retrieve embeds the query and hydrates the nearest chunks, best match first...");
  const harness = buildHarness();
  const aligned = await seedChunk(harness, { id: "aligned-chunk", text: "aaaaaaaa" });
  await seedChunk(harness, { id: "different-chunk", documentId: "doc-2", text: "zzzzzzzz" });

  const result = await harness.retriever.retrieve({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 2,
  });

  assertEqual(result.query, "aaaaaaaa", "result.query mismatch");
  assertTruthy(result.chunks.length > 0, "expected at least one retrieved chunk");
  assertEqual(result.chunks[0]?.chunk.id, aligned.id, "expected the exact-text match to rank first");
  assertEqual(result.chunks[0]?.chunk.text, aligned.text, "expected the hydrated chunk's text to match the stored chunk");
  assertTruthy(typeof result.chunks[0]?.score === "number", "expected a numeric score");
}

async function assertRetrieveIsolatesByWorkspace(): Promise<void> {
  console.log("[retrieval] retrieve only resolves chunks/vectors within the requested workspace...");
  const harness = buildHarness();
  await seedChunk(harness, { workspaceId: WORKSPACE_A, id: "a-chunk", text: "aaaaaaaa" });
  await seedChunk(harness, { workspaceId: WORKSPACE_B, id: "b-chunk", documentId: "doc-b", text: "aaaaaaaa" });

  const result = await harness.retriever.retrieve({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected only workspace A's chunk to be retrieved");
  assertEqual(result.chunks[0]?.chunk.id, "a-chunk", "expected workspace A's own chunk");
}

async function assertRetrieveSkipsStaleVectorsWithoutFailing(): Promise<void> {
  console.log("[retrieval] retrieve skips a stale vector (chunk no longer exists) instead of failing...");
  const harness = buildHarness();
  const remaining = await seedChunk(harness, { id: "remaining-chunk", text: "aaaaaaaa" });

  // Simulate a stale vector: a vector whose chunk was removed from the
  // chunk repository (e.g. by a later replaceForDocument) but whose
  // vector was never cleaned up from the index.
  const staleVector = await harness.embeddingProvider.embed("aaaaaaaa");
  await harness.vectorIndex.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: "stale-chunk-id",
    vector: staleVector,
  });

  const result = await harness.retriever.retrieve({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 10,
  });

  assertEqual(result.chunks.length, 1, "expected the stale vector to be excluded from the result");
  assertEqual(result.chunks[0]?.chunk.id, remaining.id, "expected only the still-existing chunk to be retrieved");
}

async function assertRetrieveRespectsLimit(): Promise<void> {
  console.log("[retrieval] retrieve returns at most limit chunks...");
  const harness = buildHarness();
  await seedChunk(harness, { id: "chunk-1", text: "aaaaaaaa" });
  await seedChunk(harness, { id: "chunk-2", documentId: "doc-2", text: "aaaaaaab" });
  await seedChunk(harness, { id: "chunk-3", documentId: "doc-3", text: "aaaaaaac" });

  const result = await harness.retriever.retrieve({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 1,
  });

  assertEqual(result.chunks.length, 1, "expected retrieve to truncate to the requested limit");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[retrieval] retrieve rejects invalid workspaceId/query/limit input...");
  const { retriever } = buildHarness();

  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrievalInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrievalInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: -1 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => retriever.retrieve({ workspaceId: WORKSPACE_A, query: "q", limit: 1.5 }),
    "RetrievalInput.limit must be a positive integer",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => retriever.retrieve(null),
    "RetrievalInput must be an object",
  );
}

function assertDefaultVectorRetrieverImportsOnlyPorts(): void {
  console.log("[retrieval] DefaultVectorRetriever imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/retrieval/DefaultVectorRetriever.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "../persistence",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultVectorRetriever.ts must not reference concrete adapter "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertRetrieveEmbedsQueryAndHydratesNearestChunks();
  await assertRetrieveIsolatesByWorkspace();
  await assertRetrieveSkipsStaleVectorsWithoutFailing();
  await assertRetrieveRespectsLimit();
  await assertRejectsInvalidInput();
  assertDefaultVectorRetrieverImportsOnlyPorts();
  console.log("DefaultVectorRetriever validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
