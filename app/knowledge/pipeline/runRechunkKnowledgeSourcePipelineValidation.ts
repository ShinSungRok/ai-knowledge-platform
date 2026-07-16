import { RechunkKnowledgeSourcePipeline } from "./RechunkKnowledgeSourcePipeline";
import { ChunkKnowledgeDocumentPipeline } from "./ChunkKnowledgeDocumentPipeline";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { FixedSizeDocumentChunker } from "../embedding/FixedSizeDocumentChunker";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
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

class CountingDocumentChunkRepository implements DocumentChunkRepository {
  public replaceForDocumentCalls = 0;

  constructor(private readonly inner: DocumentChunkRepository) {}

  async replaceForDocument(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void> {
    this.replaceForDocumentCalls += 1;
    return this.inner.replaceForDocument(workspaceId, documentId, chunks);
  }

  async findByDocumentId(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentChunk[]> {
    return this.inner.findByDocumentId(workspaceId, documentId);
  }
}

function buildHarness() {
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const innerDocumentRepository = new DefaultInMemoryRepository();
  const documentRepository = new CountingDocumentRepository(
    innerDocumentRepository,
  );
  const innerChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const chunkRepository = new CountingDocumentChunkRepository(
    innerChunkRepository,
  );
  const chunkingService = new FixedSizeDocumentChunker(4);
  const chunkDocumentPipeline = new ChunkKnowledgeDocumentPipeline(
    documentRepository,
    chunkRepository,
    chunkingService,
  );
  const pipeline = new RechunkKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    chunkDocumentPipeline,
  );
  return {
    sourceRepository,
    documentRepository,
    chunkRepository,
    pipeline,
  };
}

async function assertRejectsMissingSourceWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] rechunk rejects a missing source without listing documents or touching chunk storage...",
  );
  const { pipeline, documentRepository, chunkRepository } = buildHarness();

  await assertThrowsAsync(
    () => pipeline.rechunk({ workspaceId: WORKSPACE_A, sourceId: "missing-source" }),
    "KnowledgeSource not found",
  );

  assertEqual(documentRepository.findAllCalls, 0, "findAll must not be called when the source is missing");
  assertEqual(
    chunkRepository.replaceForDocumentCalls,
    0,
    "replaceForDocument must not be called when the source is missing",
  );
}

async function assertRejectsCrossWorkspaceSourceWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] rechunk rejects a source registered only in a different workspace...",
  );
  const { pipeline, sourceRepository, documentRepository, chunkRepository } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-1", name: "Source" });

  await assertThrowsAsync(
    () => pipeline.rechunk({ workspaceId: WORKSPACE_B, sourceId: "source-1" }),
    "KnowledgeSource not found",
  );

  assertEqual(documentRepository.findAllCalls, 0, "findAll must not be called for a cross-workspace source");
  assertEqual(
    chunkRepository.replaceForDocumentCalls,
    0,
    "replaceForDocument must not be called for a cross-workspace source",
  );
}

async function assertOnlyTargetSourceDocumentsAreProcessed(): Promise<void> {
  console.log(
    "[pipeline] rechunk processes only the target source's documents, leaving other sources' chunks untouched...",
  );
  const { pipeline, sourceRepository, documentRepository, chunkRepository } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-1", name: "Source 1" });
  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-2", name: "Source 2" });

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s1-a",
    sourceId: "source-1",
    title: "Title",
    text: "abcdefgh",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s1-b",
    sourceId: "source-1",
    title: "Title",
    text: "ijklmnop",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s2-a",
    sourceId: "source-2",
    title: "Title",
    text: "should not be touched",
  });

  const staleSource2Chunks = [
    {
      workspaceId: WORKSPACE_A,
      id: "stale-s2-chunk-0",
      documentId: "doc-s2-a",
      text: "stale",
      order: 0,
    },
  ];
  await chunkRepository.replaceForDocument(
    WORKSPACE_A,
    "doc-s2-a",
    staleSource2Chunks,
  );

  const result = await pipeline.rechunk({ workspaceId: WORKSPACE_A, sourceId: "source-1" });

  assertEqual(result.sourceId, "source-1", "result.sourceId mismatch");
  assertEqual(result.processedDocumentCount, 2, "expected 2 processed documents for source-1");
  assertEqual(result.savedChunkCount, 4, "expected 4 total saved chunks (2 chunks per 8-char doc, maxChunkLength=4)");
  assertEqual(
    Object.keys(result).sort().join(","),
    "processedDocumentCount,savedChunkCount,sourceId",
    "result must only contain sourceId, processedDocumentCount, savedChunkCount",
  );

  const s1DocAChunks = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-s1-a");
  assertEqual(s1DocAChunks.length, 2, "expected 2 chunks for doc-s1-a");
  const s1DocBChunks = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-s1-b");
  assertEqual(s1DocBChunks.length, 2, "expected 2 chunks for doc-s1-b");

  const s2DocAChunks = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-s2-a");
  assertEqual(s2DocAChunks.length, 1, "source-2's document chunks must remain untouched");
  assertEqual(s2DocAChunks[0]?.id, "stale-s2-chunk-0", "source-2's stale chunk must not be replaced");
  assertEqual(s2DocAChunks[0]?.text, "stale", "source-2's stale chunk text must be unchanged");
}

async function assertRerunDoesNotDuplicateChunks(): Promise<void> {
  console.log("[pipeline] rechunk does not duplicate chunks on re-run...");
  const { pipeline, sourceRepository, documentRepository, chunkRepository } =
    buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-3", name: "Source 3" });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-s3-a",
    sourceId: "source-3",
    title: "Title",
    text: "the quick brown fox",
  });

  const first = await pipeline.rechunk({ workspaceId: WORKSPACE_A, sourceId: "source-3" });
  const second = await pipeline.rechunk({ workspaceId: WORKSPACE_A, sourceId: "source-3" });

  assertEqual(first.savedChunkCount, second.savedChunkCount, "savedChunkCount must be stable across re-runs");
  const stored = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-s3-a");
  assertEqual(stored.length, second.savedChunkCount, "stored chunk count must not accumulate across re-runs");
}

async function assertEmptySourceSucceedsWithZeroCount(): Promise<void> {
  console.log("[pipeline] rechunk succeeds with a zero-count result for a source with no documents...");
  const { pipeline, sourceRepository } = buildHarness();

  await sourceRepository.save({ workspaceId: WORKSPACE_A, id: "source-empty", name: "Empty Source" });

  const result = await pipeline.rechunk({ workspaceId: WORKSPACE_A, sourceId: "source-empty" });

  assertEqual(result.sourceId, "source-empty", "result.sourceId mismatch");
  assertEqual(result.processedDocumentCount, 0, "expected 0 processed documents for an empty source");
  assertEqual(result.savedChunkCount, 0, "expected 0 saved chunks for an empty source");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[pipeline] rechunk rejects invalid workspaceId/sourceId input...");
  const { pipeline } = buildHarness();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.rechunk({ sourceId: "source-1" }),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.rechunk({ workspaceId: WORKSPACE_A }),
    "sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.rechunk(null),
    "RechunkKnowledgeSourceInput must be an object",
  );
}

async function main(): Promise<void> {
  await assertRejectsMissingSourceWithoutSideEffects();
  await assertRejectsCrossWorkspaceSourceWithoutSideEffects();
  await assertOnlyTargetSourceDocumentsAreProcessed();
  await assertRerunDoesNotDuplicateChunks();
  await assertEmptySourceSucceedsWithZeroCount();
  await assertRejectsInvalidInput();
  console.log("RechunkKnowledgeSourcePipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
