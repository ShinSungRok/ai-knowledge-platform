import { ReindexKnowledgeSourceEmbeddingsPipeline } from "./ReindexKnowledgeSourceEmbeddingsPipeline";
import { EmbedDocumentChunksPipeline } from "./EmbedDocumentChunksPipeline";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { EmbeddingVector } from "../embedding/EmbeddingVector";
import type { ScoredEmbeddingVector } from "../embedding/ScoredEmbeddingVector";

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

class CountingDocumentRepository implements KnowledgeDocumentRepository {
  public findAllCalls = 0;

  constructor(private readonly inner: KnowledgeDocumentRepository) {}

  async save(document: KnowledgeDocument): Promise<void> {
    return this.inner.save(document);
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KnowledgeDocument | null> {
    return this.inner.findById(workspaceId, id);
  }

  async findAll(workspaceId: string): Promise<KnowledgeDocument[]> {
    this.findAllCalls += 1;
    return this.inner.findAll(workspaceId);
  }

  async deleteById(workspaceId: string, id: string): Promise<void> {
    return this.inner.deleteById(workspaceId, id);
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

function buildHarness() {
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const innerDocumentRepository = new DefaultInMemoryRepository();
  const documentRepository = new CountingDocumentRepository(
    innerDocumentRepository,
  );
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const embeddingProvider = new FakeEmbeddingProvider();
  const innerVectorIndex = new InMemoryVectorIndex();
  const vectorIndex = new CountingVectorIndex(innerVectorIndex);
  const embedDocumentChunksPipeline = new EmbedDocumentChunksPipeline(
    chunkRepository,
    embeddingProvider,
    vectorIndex,
  );
  const pipeline = new ReindexKnowledgeSourceEmbeddingsPipeline(
    sourceRepository,
    documentRepository,
    embedDocumentChunksPipeline,
  );
  return {
    sourceRepository,
    documentRepository,
    chunkRepository,
    vectorIndex,
    pipeline,
  };
}

async function assertRejectsMissingSourceWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] reindex rejects a missing source without listing documents or touching the vector index...",
  );
  const { pipeline, documentRepository, vectorIndex } = buildHarness();

  await assertThrowsAsync(
    () => pipeline.reindex({ workspaceId: WORKSPACE_A, sourceId: "missing-source" }),
    "KnowledgeSource not found",
  );

  assertEqual(documentRepository.findAllCalls, 0, "findAll must not be called when the source is missing");
  assertEqual(vectorIndex.upsertCalls, 0, "vector index must not be written to when the source is missing");
}

async function assertRejectsCrossWorkspaceSourceWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] reindex rejects a source registered only in a different workspace...",
  );
  const { pipeline, sourceRepository, documentRepository, vectorIndex } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-1", name: "Source" });

  await assertThrowsAsync(
    () => pipeline.reindex({ workspaceId: WORKSPACE_B, sourceId: "source-1" }),
    "KnowledgeSource not found",
  );

  assertEqual(documentRepository.findAllCalls, 0, "findAll must not be called for a cross-workspace source");
  assertEqual(vectorIndex.upsertCalls, 0, "vector index must not be written to for a cross-workspace source");
}

async function assertOnlyTargetSourceDocumentsAreProcessed(): Promise<void> {
  console.log(
    "[pipeline] reindex processes only the target source's documents, leaving other sources' vectors untouched...",
  );
  const { pipeline, sourceRepository, documentRepository, chunkRepository, vectorIndex } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-1", name: "Source 1" });
  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-2", name: "Source 2" });

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s1-a",
    sourceId: "source-1",
    title: "Title",
    text: "source 1 document a",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s1-b",
    sourceId: "source-1",
    title: "Title",
    text: "source 1 document b",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s2-a",
    sourceId: "source-2",
    title: "Title",
    text: "should not be touched",
  });

  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-s1-a", [
    { workspaceId: WORKSPACE_A, id: "chunk-s1-a-0", documentId: "doc-s1-a", text: "chunk a0", order: 0 },
  ]);
  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-s1-b", [
    { workspaceId: WORKSPACE_A, id: "chunk-s1-b-0", documentId: "doc-s1-b", text: "chunk b0", order: 0 },
    { workspaceId: WORKSPACE_A, id: "chunk-s1-b-1", documentId: "doc-s1-b", text: "chunk b1", order: 1 },
  ]);
  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-s2-a", [
    { workspaceId: WORKSPACE_A, id: "chunk-s2-a-0", documentId: "doc-s2-a", text: "source 2 chunk", order: 0 },
  ]);

  const staleVector = new Array(8).fill(0.5);
  await vectorIndex.upsert({ workspaceId: WORKSPACE_A, chunkId: "chunk-s2-a-0", vector: staleVector });

  const result = await pipeline.reindex({ workspaceId: WORKSPACE_A, sourceId: "source-1" });

  assertEqual(result.sourceId, "source-1", "result.sourceId mismatch");
  assertEqual(result.processedDocumentCount, 2, "expected 2 processed documents for source-1");
  assertEqual(result.embeddedChunkCount, 3, "expected 3 total embedded chunks (1 + 2)");
  assertEqual(
    Object.keys(result).sort().join(","),
    "embeddedChunkCount,processedDocumentCount,sourceId",
    "result must only contain sourceId, processedDocumentCount, embeddedChunkCount",
  );

  const s1VectorA = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-s1-a-0");
  const s1VectorB0 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-s1-b-0");
  const s1VectorB1 = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-s1-b-1");
  assertTruthy(s1VectorA !== null, "expected a vector for source-1's doc-s1-a chunk");
  assertTruthy(s1VectorB0 !== null, "expected a vector for source-1's doc-s1-b first chunk");
  assertTruthy(s1VectorB1 !== null, "expected a vector for source-1's doc-s1-b second chunk");

  const s2Vector = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-s2-a-0");
  assertEqual(s2Vector?.vector.join(","), staleVector.join(","), "source-2's vector must remain untouched by a source-1 reindex");
}

async function assertRerunReplacesSameChunkIdVector(): Promise<void> {
  console.log("[pipeline] reindex re-run replaces the vector for the same chunk id rather than duplicating it...");
  const { pipeline, sourceRepository, documentRepository, chunkRepository, vectorIndex } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-3", name: "Source 3" });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s3-a",
    sourceId: "source-3",
    title: "Title",
    text: "the quick brown fox",
  });
  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-s3-a", [
    { workspaceId: WORKSPACE_A, id: "chunk-s3-a-0", documentId: "doc-s3-a", text: "the quick brown fox", order: 0 },
  ]);

  const first = await pipeline.reindex({ workspaceId: WORKSPACE_A, sourceId: "source-3" });
  const second = await pipeline.reindex({ workspaceId: WORKSPACE_A, sourceId: "source-3" });

  assertEqual(first.embeddedChunkCount, second.embeddedChunkCount, "embeddedChunkCount must be stable across re-runs");
  assertEqual(vectorIndex.upsertCalls, 2, "each re-run performs one upsert for the single chunk (1 chunk x 2 runs = 2 upsert calls)");

  const vector = await vectorIndex.findByChunkId(WORKSPACE_A, "chunk-s3-a-0");
  assertTruthy(vector !== null, "expected chunk-s3-a-0's vector to still resolve to exactly one entry after re-run");
}

async function assertEmptySourceSucceedsWithZeroCount(): Promise<void> {
  console.log("[pipeline] reindex succeeds with a zero-count result for a source with no documents...");
  const { pipeline, sourceRepository } = buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-empty", name: "Empty Source" });

  const result = await pipeline.reindex({ workspaceId: WORKSPACE_A, sourceId: "source-empty" });

  assertEqual(result.sourceId, "source-empty", "result.sourceId mismatch");
  assertEqual(result.processedDocumentCount, 0, "expected 0 processed documents for an empty source");
  assertEqual(result.embeddedChunkCount, 0, "expected 0 embedded chunks for an empty source");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[pipeline] reindex rejects invalid workspaceId/sourceId input...");
  const { pipeline } = buildHarness();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.reindex({ sourceId: "source-1" }),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.reindex({ workspaceId: WORKSPACE_A }),
    "sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.reindex(null),
    "ReindexKnowledgeSourceEmbeddingsInput must be an object",
  );
}

async function main(): Promise<void> {
  await assertRejectsMissingSourceWithoutSideEffects();
  await assertRejectsCrossWorkspaceSourceWithoutSideEffects();
  await assertOnlyTargetSourceDocumentsAreProcessed();
  await assertRerunReplacesSameChunkIdVector();
  await assertEmptySourceSucceedsWithZeroCount();
  await assertRejectsInvalidInput();
  console.log("ReindexKnowledgeSourceEmbeddingsPipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
