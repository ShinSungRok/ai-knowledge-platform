import { DefaultInMemoryDocumentChunkRepository } from "./DefaultInMemoryDocumentChunkRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";

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
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_1, [
    chunk({ id: "c-1", documentId: DOCUMENT_1, text: "doc1 body" }),
  ]);
  await repository.replaceForDocument(WORKSPACE_A, DOCUMENT_2, [
    chunk({ id: "c-1", documentId: DOCUMENT_2, text: "doc2 body" }),
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
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertFindReturnsOrderAscending();
  await assertReplaceReplacesEntireSet();
  await assertEmptyReplaceClearsChunks();
  await assertIsolatedAcrossDocumentsInSameWorkspace();
  await assertIsolatedAcrossWorkspacesForSameDocumentId();
  await assertDefensiveCopy();
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
