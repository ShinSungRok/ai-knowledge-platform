import { ChunkKnowledgeDocumentPipeline } from "./ChunkKnowledgeDocumentPipeline";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { FixedSizeDocumentChunker } from "../embedding/FixedSizeDocumentChunker";
import type { ChunkingService } from "../embedding/ChunkingService";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

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

class CountingChunkingService implements ChunkingService {
  public calls = 0;

  constructor(private readonly inner: ChunkingService) {}

  chunk(document: KnowledgeDocument): DocumentChunk[] {
    this.calls += 1;
    return this.inner.chunk(document);
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
  const documentRepository = new DefaultInMemoryRepository();
  const innerChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const chunkRepository = new CountingDocumentChunkRepository(
    innerChunkRepository,
  );
  const chunkingService = new CountingChunkingService(
    new FixedSizeDocumentChunker(4),
  );
  const pipeline = new ChunkKnowledgeDocumentPipeline(
    documentRepository,
    chunkRepository,
    chunkingService,
  );
  return { documentRepository, chunkRepository, chunkingService, pipeline };
}

async function assertRejectsMissingDocumentWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] chunkDocument rejects a missing document without calling the chunker or chunk repository...",
  );
  const { pipeline, chunkingService, chunkRepository } = buildHarness();

  await assertThrowsAsync(
    () =>
      pipeline.chunkDocument({
        workspaceId: WORKSPACE_A,
        documentId: "missing-doc",
      }),
    "KnowledgeDocument not found",
  );

  assertEqual(chunkingService.calls, 0, "chunker must not be called when the document is missing");
  assertEqual(
    chunkRepository.replaceForDocumentCalls,
    0,
    "chunk repository must not be called when the document is missing",
  );
}

async function assertRejectsCrossWorkspaceDocumentWithoutSideEffects(): Promise<void> {
  console.log(
    "[pipeline] chunkDocument rejects a document registered only in a different workspace...",
  );
  const { pipeline, documentRepository, chunkingService, chunkRepository } =
    buildHarness();

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "abcdefgh",
  });

  await assertThrowsAsync(
    () =>
      pipeline.chunkDocument({ workspaceId: WORKSPACE_B, documentId: "doc-1" }),
    "KnowledgeDocument not found",
  );

  assertEqual(chunkingService.calls, 0, "chunker must not be called for cross-workspace access");
  assertEqual(
    chunkRepository.replaceForDocumentCalls,
    0,
    "chunk repository must not be called for cross-workspace access",
  );
}

async function assertReplacesEntireExistingChunkSet(): Promise<void> {
  console.log(
    "[pipeline] chunkDocument fully replaces a document's existing chunk set...",
  );
  const { pipeline, documentRepository, chunkRepository } = buildHarness();

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-2",
    sourceId: "source-1",
    title: "Title",
    text: "abcdefgh",
  });

  await chunkRepository.replaceForDocument(WORKSPACE_A, "doc-2", [
    {
      workspaceId: WORKSPACE_A,
      id: "stale-chunk-a",
      documentId: "doc-2",
      text: "stale",
      order: 0,
    },
    {
      workspaceId: WORKSPACE_A,
      id: "stale-chunk-b",
      documentId: "doc-2",
      text: "stale",
      order: 1,
    },
  ]);

  const result = await pipeline.chunkDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-2",
  });

  assertEqual(result.documentId, "doc-2", "result.documentId mismatch");
  assertEqual(result.chunkCount, 2, "expected 2 chunks for an 8-char text with maxChunkLength=4");
  assertEqual(Object.keys(result).sort().join(","), "chunkCount,documentId", "result must only contain documentId and chunkCount");

  const stored = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-2");
  assertEqual(stored.length, 2, "expected 2 stored chunks after replacement");
  assertTruthy(
    stored.every((chunk) => chunk.id !== "stale-chunk-a" && chunk.id !== "stale-chunk-b"),
    "stale chunks must be fully replaced, not merged with new chunks",
  );
  assertEqual(stored[0]?.text, "abcd", "stored chunk 0 text mismatch");
  assertEqual(stored[1]?.text, "efgh", "stored chunk 1 text mismatch");
}

async function assertEmptyTextClearsExistingChunks(): Promise<void> {
  console.log(
    "[pipeline] chunkDocument with an empty-text document clears existing chunks...",
  );
  const { pipeline, documentRepository, chunkRepository } = buildHarness();

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-3",
    sourceId: "source-1",
    title: "Title",
    text: "will be emptied",
  });
  await pipeline.chunkDocument({ workspaceId: WORKSPACE_A, documentId: "doc-3" });
  const beforeClear = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-3");
  assertTruthy(beforeClear.length > 0, "expected chunks to exist before emptying the text");

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-3",
    sourceId: "source-1",
    title: "Title",
    text: "",
  });
  const result = await pipeline.chunkDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-3",
  });

  assertEqual(result.chunkCount, 0, "expected 0 chunks after emptying the document text");
  const afterClear = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-3");
  assertEqual(afterClear.length, 0, "expected existing chunks to be cleared for empty text");
}

async function assertRepeatedRunsAreStable(): Promise<void> {
  console.log(
    "[pipeline] chunkDocument produces a stable result across repeated runs on the same input...",
  );
  const { pipeline, documentRepository, chunkRepository } = buildHarness();

  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: "doc-4",
    sourceId: "source-1",
    title: "Title",
    text: "the quick brown fox",
  });

  const first = await pipeline.chunkDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-4",
  });
  const firstStored = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-4");

  const second = await pipeline.chunkDocument({
    workspaceId: WORKSPACE_A,
    documentId: "doc-4",
  });
  const secondStored = await chunkRepository.findByDocumentId(WORKSPACE_A, "doc-4");

  assertEqual(first.chunkCount, second.chunkCount, "chunkCount must be stable across repeated runs");
  assertEqual(firstStored.length, secondStored.length, "stored chunk count must be stable across repeated runs");
  for (let i = 0; i < firstStored.length; i += 1) {
    assertEqual(firstStored[i]?.id, secondStored[i]?.id, `chunk ${i} id must be stable across repeated runs`);
    assertEqual(firstStored[i]?.text, secondStored[i]?.text, `chunk ${i} text must be stable across repeated runs`);
    assertEqual(firstStored[i]?.order, secondStored[i]?.order, `chunk ${i} order must be stable across repeated runs`);
  }
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[pipeline] chunkDocument rejects invalid workspaceId/documentId input...");
  const { pipeline } = buildHarness();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.chunkDocument({ documentId: "doc-1" }),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.chunkDocument({ workspaceId: WORKSPACE_A }),
    "documentId must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => pipeline.chunkDocument(null),
    "ChunkKnowledgeDocumentInput must be an object",
  );
}

async function main(): Promise<void> {
  await assertRejectsMissingDocumentWithoutSideEffects();
  await assertRejectsCrossWorkspaceDocumentWithoutSideEffects();
  await assertReplacesEntireExistingChunkSet();
  await assertEmptyTextClearsExistingChunks();
  await assertRepeatedRunsAreStable();
  await assertRejectsInvalidInput();
  console.log("ChunkKnowledgeDocumentPipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
