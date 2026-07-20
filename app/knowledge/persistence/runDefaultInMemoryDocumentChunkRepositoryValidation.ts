import { DefaultInMemoryDocumentChunkRepository } from "./DefaultInMemoryDocumentChunkRepository";
import { FixedSizeDocumentChunker } from "../embedding/FixedSizeDocumentChunker";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const DOCUMENT_1 = "doc-1";
const DOCUMENT_2 = "doc-2";

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

function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`Expected rejection containing: ${messageSubstring}`);
    },
    (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      assertTruthy(
        text.includes(messageSubstring),
        `Expected error message to include "${messageSubstring}", got: ${text}`,
      );
    },
  );
}

function chunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: DOCUMENT_1,
    text: "body",
    order: 0,
    ...overrides,
  };
}

async function assertPortContract(): Promise<void> {
  console.log("[repository] port contract (DocumentChunkRepository)...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  assertTruthy(
    typeof repository.replaceForDocument === "function",
    "replaceForDocument must be defined",
  );
  assertTruthy(
    typeof repository.findByDocumentId === "function",
    "findByDocumentId must be defined",
  );
  assertTruthy(
    typeof repository.findById === "function",
    "findById must be defined",
  );
}

async function assertFindReturnsOrderAscending(): Promise<void> {
  console.log("[repository] findByDocumentId returns chunks sorted by order ascending...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "c-2", order: 2, text: "second" }),
    chunk({ id: "c-0", order: 0, text: "zeroth" }),
    chunk({ id: "c-1", order: 1, text: "first" }),
  ]);

  const found = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(found.length, 3, "expected three chunks");
  assertEqual(found[0]?.id, "c-0", "chunk 0 order mismatch");
  assertEqual(found[1]?.id, "c-1", "chunk 1 order mismatch");
  assertEqual(found[2]?.id, "c-2", "chunk 2 order mismatch");
}

async function assertReplaceReplacesEntireSet(): Promise<void> {
  console.log("[repository] replaceForDocument replaces the entire existing chunk set...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "c-1", order: 0 }),
    chunk({ id: "c-2", order: 1 }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "c-3", order: 0, text: "replacement" }),
  ]);

  const found = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(found.length, 1, "expected the previous chunk set to be fully replaced");
  assertEqual(found[0]?.id, "c-3", "expected only the new chunk to remain");
  assertEqual(found[0]?.text, "replacement", "expected the new chunk's text");
}

async function assertEmptyReplaceClearsChunks(): Promise<void> {
  console.log("[repository] replaceForDocument with an empty array clears existing chunks...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [chunk()]);
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, []);

  const found = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(found.length, 0, "expected no chunks after an empty-array replace");
}

async function assertIsolatedAcrossDocumentsInSameWorkspace(): Promise<void> {
  console.log("[repository] chunks are isolated per documentId within the same workspace...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  // Distinct ids: `id` is a workspace-global identity (Task 23), so two
  // different documents in the same workspace cannot share a chunk id.
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "doc1-c-1", documentId: DOCUMENT_1, text: "doc1 body" }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_2, [
    chunk({ id: "doc2-c-1", documentId: DOCUMENT_2, text: "doc2 body" }),
  ]);

  const doc1 = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  const doc2 = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_2);
  assertEqual(doc1.length, 1, "expected one chunk for document 1");
  assertEqual(doc2.length, 1, "expected one chunk for document 2");
  assertEqual(doc1[0]?.text, "doc1 body", "document 1 chunk text mismatch");
  assertEqual(doc2[0]?.text, "doc2 body", "document 2 chunk text mismatch");
}

async function assertIsolatedAcrossWorkspacesForSameDocumentId(): Promise<void> {
  console.log("[repository] chunks are isolated per workspace for the same documentId...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ workspaceId: WORKSPACE_A, id: "c-1", text: "workspace a" }),
  ]);
  await repository.replaceForDocument(WORKSPACE_B, DOCUMENT_1, [
    chunk({ workspaceId: WORKSPACE_B, id: "c-1", text: "workspace b" }),
  ]);

  const fromA = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  const fromB = await repository.findByDocumentId(WORKSPACE_B, DOCUMENT_1);
  assertEqual(fromA.length, 1, "expected one chunk for workspace A");
  assertEqual(fromB.length, 1, "expected one chunk for workspace B");
  assertEqual(fromA[0]?.text, "workspace a", "workspace A chunk text mismatch");
  assertEqual(fromB[0]?.text, "workspace b", "workspace B chunk text mismatch");
}

async function assertDefensiveCopy(): Promise<void> {
  console.log("[repository] defensive copy on replace input and findByDocumentId output...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const input: DocumentChunk[] = [chunk({ id: "c-1", order: 0, text: "original" })];
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, input);

  const firstInput = input[0];
  if (!firstInput) {
    throw new Error("Expected an input chunk at index 0");
  }
  firstInput.text = "mutated-input";
  input.push(chunk({ id: "c-2", order: 1, text: "must not appear" }));

  const first = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(first.length, 1, "stored chunks must not grow from a mutated input array");
  assertEqual(first[0]?.text, "original", "stored chunk must not reflect a mutated input object");

  const firstResult = first[0];
  if (!firstResult) {
    throw new Error("Expected a fetched chunk at index 0");
  }
  firstResult.text = "mutated-output";
  first.push(chunk({ id: "c-3", order: 2, text: "must not appear" }));

  const second = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(second.length, 1, "stored chunks must not reflect a mutated output array");
  assertEqual(second[0]?.text, "original", "stored chunk must not reflect a mutated output object");
}

async function assertFindByIdResolvesWorkspaceGlobalChunk(): Promise<void> {
  console.log("[repository] findById resolves a chunk by its workspace-global id...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "chunk-x", order: 0, text: "body x" }),
  ]);

  const found = await repository.findById(WORKSPACE_A, "chunk-x");
  assertTruthy(found !== null, "expected findById to resolve a stored chunk");
  assertEqual(found?.id, "chunk-x", "found.id mismatch");
  assertEqual(found?.documentId, DOCUMENT_1, "found.documentId mismatch");
  assertEqual(found?.text, "body x", "found.text mismatch");
}

async function assertFindByIdReturnsNullForMissingOrCrossWorkspaceChunk(): Promise<void> {
  console.log("[repository] findById returns null for a missing chunk id or a chunk id owned in a different workspace...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "chunk-y", order: 0 }),
  ]);

  const missing = await repository.findById(WORKSPACE_A, "missing-chunk");
  assertEqual(missing, null, "expected null for a missing chunk id");

  const crossWorkspace = await repository.findById(WORKSPACE_B, "chunk-y");
  assertEqual(crossWorkspace, null, "expected null for a chunk id that only exists in a different workspace");
}

async function assertReplaceAllowsSameDocumentToReuseItsOwnChunkIds(): Promise<void> {
  console.log("[repository] replaceForDocument allows a document to reuse its own previously-owned chunk ids...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "stable-chunk-0", order: 0, text: "version 1" }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "stable-chunk-0", order: 0, text: "version 2" }),
  ]);

  const found = await repository.findById(WORKSPACE_A, "stable-chunk-0");
  assertEqual(found?.text, "version 2", "expected the same document's re-use of its own chunk id to succeed and update the text");
}

async function assertReplaceRejectsChunkIdOwnedByDifferentDocumentWithoutPartialWrite(): Promise<void> {
  console.log(
    "[repository] replaceForDocument rejects a chunk id already owned by a different document in the same workspace, without a partial write...",
  );
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "shared-id", documentId: DOCUMENT_1, order: 0, text: "owned by doc-1" }),
  ]);

  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_2, [
      chunk({ id: "shared-id", documentId: DOCUMENT_2, order: 0, text: "attempted takeover" }),
      chunk({ id: "doc-2-own-chunk", documentId: DOCUMENT_2, order: 1, text: "unaffected" }),
    ]),
    "is already owned by a different document",
  );

  const doc1Chunks = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(doc1Chunks.length, 1, "doc-1's chunk set must be unaffected by the rejected conflicting batch");
  assertEqual(doc1Chunks[0]?.text, "owned by doc-1", "doc-1's chunk must remain unchanged");

  const doc2Chunks = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_2);
  assertEqual(doc2Chunks.length, 0, "doc-2 must have no chunks saved from the rejected batch (no partial write)");

  const owner = await repository.findById(WORKSPACE_A, "shared-id");
  assertEqual(owner?.documentId, DOCUMENT_1, "the shared-id chunk must still resolve to its original owner, doc-1");
}

async function assertFixedSizeDocumentChunkerIdsAreWorkspaceGlobalCompatible(): Promise<void> {
  console.log(
    "[repository] FixedSizeDocumentChunker-generated ids from different documents are workspace-global-identity compatible...",
  );
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const chunker = new FixedSizeDocumentChunker(4);

  const documentOne: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-alpha",
    sourceId: "source-1",
    title: "Alpha",
    text: "abcdefgh",
  };
  const documentTwo: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-beta",
    sourceId: "source-1",
    title: "Beta",
    text: "ijklmnop",
  };

  await repository.replaceForDocument(
    WORKSPACE_A,
    documentOne.id,
    chunker.chunk(documentOne),
  );
  await repository.replaceForDocument(
    WORKSPACE_A,
    documentTwo.id,
    chunker.chunk(documentTwo),
  );

  const oneChunks = await repository.findByDocumentId(WORKSPACE_A, documentOne.id);
  const twoChunks = await repository.findByDocumentId(WORKSPACE_A, documentTwo.id);
  assertEqual(oneChunks.length, 2, "expected 2 chunks for doc-alpha");
  assertEqual(twoChunks.length, 2, "expected 2 chunks for doc-beta");

  const resolvedFromOne = await repository.findById(WORKSPACE_A, oneChunks[0]?.id ?? "");
  const resolvedFromTwo = await repository.findById(WORKSPACE_A, twoChunks[0]?.id ?? "");
  assertEqual(resolvedFromOne?.documentId, documentOne.id, "expected doc-alpha's first chunk id to resolve back to doc-alpha");
  assertEqual(resolvedFromTwo?.documentId, documentTwo.id, "expected doc-beta's first chunk id to resolve back to doc-beta");
}

async function assertRejectsScopeMismatch(): Promise<void> {
  console.log("[repository] replaceForDocument rejects chunks whose workspaceId/documentId do not match...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();

  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
      chunk({ workspaceId: WORKSPACE_B }),
    ]),
    "does not match the requested workspaceId",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
      chunk({ documentId: DOCUMENT_2 }),
    ]),
    "does not match the requested documentId",
  );
}

async function assertRejectsDuplicateIdAndOrder(): Promise<void> {
  console.log("[repository] replaceForDocument rejects duplicate chunk id/order within the batch...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();

  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
      chunk({ id: "c-1", order: 0 }),
      chunk({ id: "c-1", order: 1 }),
    ]),
    "Duplicate DocumentChunk.id",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
      chunk({ id: "c-1", order: 0 }),
      chunk({ id: "c-2", order: 0 }),
    ]),
    "Duplicate DocumentChunk.order",
  );

  const found = await repository.findByDocumentId(WORKSPACE_A, DOCUMENT_1);
  assertEqual(found.length, 0, "no chunk from a rejected batch must be saved");
}

async function assertRejectsInvalidOrder(): Promise<void> {
  console.log("[repository] replaceForDocument rejects negative or non-integer order...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();

  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [chunk({ order: -1 })]),
    "order must be a non-negative integer",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [chunk({ order: 1.5 })]),
    "order must be a non-negative integer",
  );
}

async function assertRejectsInvalidFields(): Promise<void> {
  console.log("[repository] rejects empty workspaceId/documentId/id/text...");
  const repository: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository();

  await assertRejects(
    repository.replaceForDocument(" ", DOCUMENT_1, []),
    "DocumentChunk.workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, " ", []),
    "DocumentChunk.documentId must be a non-empty string",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [chunk({ id: " " })]),
    "DocumentChunk.id must be a non-empty string",
  );
  await assertRejects(
    repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [chunk({ text: " " })]),
    "DocumentChunk.text must be a non-empty string",
  );
  await assertRejects(
    repository.findByDocumentId(" ", DOCUMENT_1),
    "DocumentChunk.workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.findByDocumentId(WORKSPACE_A, " "),
    "DocumentChunk.documentId must be a non-empty string",
  );
  await assertRejects(
    repository.findById(" ", "chunk-1"),
    "DocumentChunk.workspaceId must be a non-empty string",
  );
  await assertRejects(
    repository.findById(WORKSPACE_A, " "),
    "DocumentChunk.id must be a non-empty string",
  );
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertFindReturnsOrderAscending();
  await assertReplaceReplacesEntireSet();
  await assertEmptyReplaceClearsChunks();
  await assertIsolatedAcrossDocumentsInSameWorkspace();
  await assertIsolatedAcrossWorkspacesForSameDocumentId();
  await assertDefensiveCopy();
  await assertFindByIdResolvesWorkspaceGlobalChunk();
  await assertFindByIdReturnsNullForMissingOrCrossWorkspaceChunk();
  await assertReplaceAllowsSameDocumentToReuseItsOwnChunkIds();
  await assertReplaceRejectsChunkIdOwnedByDifferentDocumentWithoutPartialWrite();
  await assertFixedSizeDocumentChunkerIdsAreWorkspaceGlobalCompatible();
  await assertRejectsScopeMismatch();
  await assertRejectsDuplicateIdAndOrder();
  await assertRejectsInvalidOrder();
  await assertRejectsInvalidFields();
  console.log("DefaultInMemoryDocumentChunkRepository validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
