import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { EMBEDDING_VECTOR_DIMENSION } from "../embedding/EmbeddingVectorDimension";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import type { VectorIndex } from "../embedding/VectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import { DefaultKnowledgeSourceReconciler } from "./DefaultKnowledgeSourceReconciler";
import type { KnowledgeSourceReconciler } from "./KnowledgeSourceReconciler";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const SOURCE_A = "source-a";
const SOURCE_B = "source-b";

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

function unitVector(oneIndex: number): number[] {
  const vector = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
  vector[oneIndex] = 1;
  return vector;
}

function document(
  overrides: Partial<KnowledgeDocument> & Pick<KnowledgeDocument, "id">,
): KnowledgeDocument {
  return {
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_A,
    title: "Title",
    text: "Body",
    ...overrides,
  };
}

function chunk(
  overrides: Partial<DocumentChunk> &
    Pick<DocumentChunk, "id" | "documentId" | "order">,
): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    text: "chunk-text",
    ...overrides,
  };
}

function buildReconciler(
  documents: KnowledgeDocumentRepository = new DefaultInMemoryRepository(),
  chunks: DocumentChunkRepository = new DefaultInMemoryDocumentChunkRepository(),
  vectors: VectorIndex = new InMemoryVectorIndex(),
): {
  reconciler: KnowledgeSourceReconciler;
  documents: KnowledgeDocumentRepository;
  chunks: DocumentChunkRepository;
  vectors: VectorIndex;
} {
  return {
    reconciler: new DefaultKnowledgeSourceReconciler(documents, chunks, vectors),
    documents,
    chunks,
    vectors,
  };
}

async function assertPortContract(): Promise<void> {
  console.log("[pipeline] port contract (KnowledgeSourceReconciler)...");
  const { reconciler } = buildReconciler();
  assertTruthy(
    typeof reconciler.reconcile === "function",
    "reconcile must be defined",
  );
}

async function assertCleansDocumentChunksAndVectors(): Promise<void> {
  console.log(
    "[pipeline] reconcile deletes vectors, clears chunks, then deletes documents...",
  );
  const { reconciler, documents, chunks, vectors } = buildReconciler();
  await documents.save(document({ id: "doc-1" }));
  await documents.save(document({ id: "doc-2" }));
  await chunks.replaceForDocument(WORKSPACE_A, "doc-1", [
    chunk({ id: "c1", documentId: "doc-1", order: 0 }),
    chunk({ id: "c2", documentId: "doc-1", order: 1 }),
  ]);
  await chunks.replaceForDocument(WORKSPACE_A, "doc-2", [
    chunk({ id: "c3", documentId: "doc-2", order: 0 }),
  ]);
  await vectors.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: "c1",
    vector: unitVector(0),
  });
  await vectors.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: "c2",
    vector: unitVector(1),
  });
  await vectors.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: "c3",
    vector: unitVector(2),
  });

  const result = await reconciler.reconcile({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_A,
    removedDocumentIds: ["doc-1"],
  });

  assertEqual(result.removedDocumentCount, 1, "removedDocumentCount");
  assertEqual(result.removedChunkCount, 2, "removedChunkCount");
  assertEqual(result.removedVectorCount, 2, "removedVectorCount");
  assertEqual(await documents.findById(WORKSPACE_A, "doc-1"), null, "doc-1 gone");
  assertTruthy(
    (await documents.findById(WORKSPACE_A, "doc-2")) !== null,
    "doc-2 remains",
  );
  assertEqual(
    (await chunks.findByDocumentId(WORKSPACE_A, "doc-1")).length,
    0,
    "doc-1 chunks cleared",
  );
  assertEqual(
    (await chunks.findByDocumentId(WORKSPACE_A, "doc-2")).length,
    1,
    "doc-2 chunks remain",
  );
  assertEqual(await vectors.findByChunkId(WORKSPACE_A, "c1"), null, "c1 vector gone");
  assertEqual(await vectors.findByChunkId(WORKSPACE_A, "c2"), null, "c2 vector gone");
  assertTruthy(
    (await vectors.findByChunkId(WORKSPACE_A, "c3")) !== null,
    "c3 vector remains",
  );
}

async function assertSkipsMissingDocuments(): Promise<void> {
  console.log(
    "[pipeline] reconcile skips missing documents without counting them...",
  );
  const { reconciler, documents } = buildReconciler();
  await documents.save(document({ id: "present" }));

  const result = await reconciler.reconcile({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_A,
    removedDocumentIds: ["missing", "present"],
  });

  assertEqual(result.removedDocumentCount, 1, "only present counted");
  assertEqual(await documents.findById(WORKSPACE_A, "present"), null, "present deleted");
}

async function assertRejectsSourceMismatchWithoutFurtherDeletes(): Promise<void> {
  console.log(
    "[pipeline] reconcile rejects source mismatch and does not continue deletions...",
  );
  const { reconciler, documents } = buildReconciler();
  await documents.save(document({ id: "ok", sourceId: SOURCE_A }));
  await documents.save(document({ id: "bad", sourceId: SOURCE_B }));
  await documents.save(document({ id: "later", sourceId: SOURCE_A }));

  await assertThrowsAsync(
    () =>
      reconciler.reconcile({
        workspaceId: WORKSPACE_A,
        sourceId: SOURCE_A,
        removedDocumentIds: ["ok", "bad", "later"],
      }),
    "Document source mismatch during reconcile",
  );

  assertEqual(await documents.findById(WORKSPACE_A, "ok"), null, "ok already deleted");
  assertTruthy(
    (await documents.findById(WORKSPACE_A, "bad")) !== null,
    "bad not deleted",
  );
  assertTruthy(
    (await documents.findById(WORKSPACE_A, "later")) !== null,
    "later not deleted after mismatch",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log(
    "[pipeline] reconcile only touches documents in the requested workspace...",
  );
  const { reconciler, documents } = buildReconciler();
  await documents.save(document({ id: "shared", workspaceId: WORKSPACE_A }));
  await documents.save(document({ id: "shared", workspaceId: WORKSPACE_B }));

  const result = await reconciler.reconcile({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_A,
    removedDocumentIds: ["shared"],
  });

  assertEqual(result.removedDocumentCount, 1, "one document removed");
  assertEqual(await documents.findById(WORKSPACE_A, "shared"), null, "a gone");
  assertTruthy(
    (await documents.findById(WORKSPACE_B, "shared")) !== null,
    "b remains",
  );
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[pipeline] reconcile rejects invalid input...");
  const { reconciler } = buildReconciler();
  await assertThrowsAsync(
    () =>
      reconciler.reconcile({
        workspaceId: " ",
        sourceId: SOURCE_A,
        removedDocumentIds: [],
      }),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      reconciler.reconcile({
        workspaceId: WORKSPACE_A,
        sourceId: SOURCE_A,
        // @ts-expect-error intentional
        removedDocumentIds: null,
      }),
    "removedDocumentIds must be an array",
  );
  await assertThrowsAsync(
    () =>
      reconciler.reconcile({
        workspaceId: WORKSPACE_A,
        sourceId: SOURCE_A,
        removedDocumentIds: [" "],
      }),
    "removedDocumentIds entry must be a non-empty string",
  );
}

function assertImportsOnlyPorts(): void {
  console.log(
    "[pipeline] DefaultKnowledgeSourceReconciler imports only ports, never concrete adapters...",
  );
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/pipeline/DefaultKnowledgeSourceReconciler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbidden = [
    "DefaultInMemoryRepository",
    "DefaultInMemoryDocumentChunkRepository",
    "InMemoryVectorIndex",
    "FakeKnowledgeSourceConnector",
    "DefaultKnowledgeSourceChangeDetector",
    "../persistence",
  ];
  for (const reference of forbidden) {
    assertTruthy(
      !source.includes(reference),
      `must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertCleansDocumentChunksAndVectors();
  await assertSkipsMissingDocuments();
  await assertRejectsSourceMismatchWithoutFurtherDeletes();
  await assertWorkspaceIsolation();
  await assertRejectsInvalidInput();
  assertImportsOnlyPorts();
  console.log("DefaultKnowledgeSourceReconciler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
