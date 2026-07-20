import { EmbedDocumentChunksPipeline } from "./EmbedDocumentChunksPipeline";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { EMBEDDING_VECTOR_DIMENSION } from "../embedding/EmbeddingVectorDimension";
import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { EmbeddingVector } from "../embedding/EmbeddingVector";
import type { ScoredEmbeddingVector } from "../embedding/ScoredEmbeddingVector";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";

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

class CountingEmbeddingProvider implements EmbeddingProvider {
  public embedCalls = 0;

  constructor(private readonly inner: EmbeddingProvider) {}

  async embed(text: string): Promise<number[]> {
    this.embedCalls += 1;
    return this.inner.embed(text);
  }
}

class CountingVectorIndex implements VectorIndex {
  public upsertCalls = 0;

  constructor(private readonly inner: VectorIndex) {}

  async upsert(vector: EmbeddingVector): Promise<void> {
    this.upsertCalls += 1;
    return this.inner.upsert(vector);
  }

  async findByChunkId(
    workspaceId: string,
    chunkId: string,
  ): Promise<EmbeddingVector | null> {
    return this.inner.findByChunkId(workspaceId, chunkId);
  }

  async findNearest(
    workspaceId: string,
    queryVector: number[],
    limit: number,
  ): Promise<ScoredEmbeddingVector[]> {
    return this.inner.findNearest(workspaceId, queryVector, limit);
  }
}

/** Test double returning a pre-configured vector for each successive call, in order. */
class SequencedEmbeddingProvider implements EmbeddingProvider {
  private callCount = 0;

  constructor(private readonly responses: number[][]) {}

  async embed(_text: string): Promise<number[]> {
    const response = this.responses[this.callCount];
    this.callCount += 1;
    if (!response) {
      throw new Error("SequencedEmbeddingProvider: no more responses configured");
    }
    return response;
  }
}

function buildHarness() {
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const embeddingProvider = new CountingEmbeddingProvider(
    new FakeEmbeddingProvider(),
  );
  const vectorIndex = new CountingVectorIndex(new InMemoryVectorIndex());
  const pipeline = new EmbedDocumentChunksPipeline(
    chunkRepository,
    embeddingProvider,
    vectorIndex,
  );
  return { chunkRepository, embeddingProvider, vectorIndex, pipeline };
}

function makeChunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-0",
    documentId: "doc-1",
    text: "hello world",
    order: 0,
    ...overrides,
  };
}

async function assertEmptyChunksReturnsZeroWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] embedDocument returns a zero-count result for a document with no chunks, without calling the provider or vector index...",
  );
  const { pipeline, embeddingProvider, vectorIndex } = buildHarness();

  const result = await pipeline.embedDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-empty",
  });

  assertEqual(result.documentId, "doc-empty", "result.documentId mismatch");
  assertEqual(result.embeddedChunkCount, 0, "expected 0 embedded chunks for a document with no chunks");
  assertEqual(embeddingProvider.embedCalls, 0, "provider must not be called when there are no chunks");
  assertEqual(vectorIndex.upsertCalls, 0, "vector index must not be called when there are no chunks");
}

async function assertEmbedsEachChunkAndStoresVector(): Promise<void> {
  console.log("[pipeline] embedDocument embeds every chunk and stores its vector...");
  const { pipeline, chunkRepository, vectorIndex } = buildHarness();

  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-1", [
    makeChunk({ id: "chunk-0", order: 0, text: "first chunk text" }),
    makeChunk({ id: "chunk-1", order: 1, text: "second chunk text" }),
  ]);

  const result = await pipeline.embedDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-1",
  });

  assertEqual(result.documentId, "doc-1", "result.documentId mismatch");
  assertEqual(result.embeddedChunkCount, 2, "expected 2 embedded chunks");
  assertEqual(
    Object.keys(result).sort().join(","),
    "documentId,embeddedChunkCount",
    "result must only contain documentId and embeddedChunkCount",
  );

  const vector0 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-0");
  const vector1 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-1");
  assertTruthy(vector0 !== null, "expected a vector to be stored for chunk-0");
  assertTruthy(vector1 !== null, "expected a vector to be stored for chunk-1");
  assertEqual(vector0?.vector.length, EMBEDDING_VECTOR_DIMENSION, "chunk-0 vector dimension mismatch");
  assertEqual(vector1?.vector.length, EMBEDDING_VECTOR_DIMENSION, "chunk-1 vector dimension mismatch");
  assertTruthy(
    vector0?.vector.join(",") !== vector1?.vector.join(","),
    "different chunk texts are expected to embed to different vectors",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[pipeline] embedDocument keeps vectors isolated per workspace...");
  const { pipeline, chunkRepository, vectorIndex } = buildHarness();

  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-shared", [
    makeChunk({ workspaceId: WORKSPACE_A, id: "chunk-shared", documentId: "doc-shared", text: "workspace A text" }),
  ]);
  await chunkRepository.replaceForDocument(WORKSPACE_B, "doc-shared", [
    makeChunk({ workspaceId: WORKSPACE_B, id: "chunk-shared", documentId: "doc-shared", text: "workspace B text" }),
  ]);

  await pipeline.embedDocument({ workspaceId: WORKSPACE_A, documentId: "doc-shared" });
  await pipeline.embedDocument({ workspaceId: WORKSPACE_B, documentId: "doc-shared" });

  const vectorA = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-shared");
  const vectorB = await vectorIndex.findByChunkId(WORKSPACE_B, "chunk-shared");
  assertTruthy(vectorA !== null, "expected a vector for workspace A's chunk");
  assertTruthy(vectorB !== null, "expected a vector for workspace B's chunk");
  assertTruthy(
    vectorA?.vector.join(",") !== vectorB?.vector.join(","),
    "different workspace texts are expected to embed to different vectors",
  );
}

async function assertInvalidProviderResultRejectedBeforeAnyWrite(): Promise<void> {
  console.log(
    "[pipeline] embedDocument rejects an invalid provider result before any vector index write...",
  );
  const chunkRepository: DocumentChunkRepository =
    new DefaultInMemoryDocumentChunkRepository();
  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-faulty", [
    makeChunk({ id: "chunk-0", documentId: "doc-faulty", order: 0, text: "ok" }),
    makeChunk({ id: "chunk-1", documentId: "doc-faulty", order: 1, text: "also ok" }),
  ]);

  const validVector = new Array(EMBEDDING_VECTOR_DIMENSION).fill(1);
  const wrongDimensionVector = [1, 2, 3];
  const faultyProvider = new SequencedEmbeddingProvider([
    validVector,
    wrongDimensionVector,
  ]);
  const vectorIndex = new CountingVectorIndex(new InMemoryVectorIndex());
  const pipeline = new EmbedDocumentChunksPipeline(
    chunkRepository,
    faultyProvider,
    vectorIndex,
  );

  await assertThrowsAsync(
    () => pipeline.embedDocument({ workspaceId: WORKSPACE_A, documentId: "doc-faulty" }),
    `must return exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
  );
  assertEqual(vectorIndex.upsertCalls, 0, "no vector index write may occur when any provider result is invalid");

  const stored = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-0");
  assertEqual(stored, null, "chunk-0's vector must not have been written despite being valid, since chunk-1 failed validation");

  const nonFiniteProvider = new SequencedEmbeddingProvider([
    validVector,
    [1, 2, 3, 4, 5, 6, 7, Number.NaN],
  ]);
  const nonFiniteVectorIndex = new CountingVectorIndex(new InMemoryVectorIndex());
  const nonFinitePipeline = new EmbedDocumentChunksPipeline(
    chunkRepository,
    nonFiniteProvider,
    nonFiniteVectorIndex,
  );
  await assertThrowsAsync(
    () => nonFinitePipeline.embedDocument({ workspaceId: WORKSPACE_A, documentId: "doc-faulty" }),
    "must all be finite numbers",
  );
  assertEqual(nonFiniteVectorIndex.upsertCalls, 0, "no vector index write may occur when any provider result is non-finite");
}

async function assertRerunReplacesRatherThanDuplicates(): Promise<void> {
  console.log("[pipeline] re-running embedDocument replaces vectors rather than duplicating them...");
  const { pipeline, chunkRepository, vectorIndex } = buildHarness();

  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-rerun", [
    makeChunk({ id: "chunk-0", documentId: "doc-rerun", order: 0, text: "stable text" }),
    makeChunk({ id: "chunk-1", documentId: "doc-rerun", order: 1, text: "another stable text" }),
  ]);

  const first = await pipeline.embedDocument({ workspaceId: WORKSPACE_A, documentId: "doc-rerun" });
  const second = await pipeline.embedDocument({ workspaceId: WORKSPACE_A, documentId: "doc-rerun" });

  assertEqual(first.embeddedChunkCount, second.embeddedChunkCount, "embeddedChunkCount must be stable across re-runs");
  assertEqual(vectorIndex.upsertCalls, 4, "each re-run performs one upsert per chunk (2 chunks x 2 runs = 4 upsert calls)");

  const vector0 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-0");
  const vector1 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-1");
  assertTruthy(vector0 !== null, "expected chunk-0's vector to still resolve to exactly one entry after re-run");
  assertTruthy(vector1 !== null, "expected chunk-1's vector to still resolve to exactly one entry after re-run");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[pipeline] embedDocument rejects invalid workspaceId/documentId input...");
  const { pipeline } = buildHarness();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.embedDocument({ documentId: "doc-1" }),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.embedDocument({ workspaceId: WORKSPACE_A }),
    "documentId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.embedDocument(null),
    "EmbedDocumentChunksInput must be an object",
  );
}

async function main(): Promise<void> {
  await assertEmptyChunksReturnsZeroWithoutSideEffects();
  await assertEmbedsEachChunkAndStoresVector();
  await assertWorkspaceIsolation();
  await assertInvalidProviderResultRejectedBeforeAnyWrite();
  await assertRerunReplacesRatherThanDuplicates();
  await assertRejectsInvalidInput();
  console.log("EmbedDocumentChunksPipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
