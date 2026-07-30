import { readFileSync } from "node:fs";
import path from "node:path";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import { EMBEDDING_VECTOR_DIMENSION } from "../embedding/EmbeddingVectorDimension";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import { DefaultKnowledgeSourceChangeDetector } from "./DefaultKnowledgeSourceChangeDetector";
import { DefaultKnowledgeSourceReconciler } from "./DefaultKnowledgeSourceReconciler";
import {
  FakeKnowledgeSourceConnector,
  type FakeKnowledgeSourceFixture,
} from "./FakeKnowledgeSourceConnector";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";
import { ReconcilingSyncKnowledgeSourcePipeline } from "./ReconcilingSyncKnowledgeSourcePipeline";

const WORKSPACE_A = "workspace-a";
const SOURCE_1 = "source-1";
const SOURCE_2 = "source-2";

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

function canonicalId(sourceId: string, externalId: string): string {
  return `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`;
}

class CountingConnector implements KnowledgeSourceConnector {
  callCount = 0;
  constructor(private readonly documents: ConnectorDocument[]) {}
  async fetchDocuments(_source: KnowledgeSource): Promise<ConnectorDocument[]> {
    this.callCount += 1;
    return this.documents;
  }
}

class CountingDocumentRepository implements KnowledgeDocumentRepository {
  saveCalls = 0;
  constructor(private readonly inner: KnowledgeDocumentRepository) {}
  async save(document: KnowledgeDocument): Promise<void> {
    this.saveCalls += 1;
    return this.inner.save(document);
  }
  findById(workspaceId: string, id: string) {
    return this.inner.findById(workspaceId, id);
  }
  findAll(workspaceId: string) {
    return this.inner.findAll(workspaceId);
  }
  deleteById(workspaceId: string, id: string) {
    return this.inner.deleteById(workspaceId, id);
  }
}

class CountingReconciler {
  calls = 0;
  lastRemovedIds: readonly string[] = [];
  constructor(private readonly inner: DefaultKnowledgeSourceReconciler) {}
  async reconcile(input: {
    workspaceId: string;
    sourceId: string;
    removedDocumentIds: readonly string[];
  }) {
    this.calls += 1;
    this.lastRemovedIds = input.removedDocumentIds;
    return this.inner.reconcile(input);
  }
}

async function registerSource(
  sourceRepository: KnowledgeSourceRepository,
  workspaceId: string,
  id: string = SOURCE_1,
): Promise<void> {
  await sourceRepository.save({ workspaceId, id, name: "Docs Portal" });
}

function buildPipeline(options: {
  sourceRepository?: KnowledgeSourceRepository;
  documentRepository?: KnowledgeDocumentRepository;
  connector: KnowledgeSourceConnector;
  reconciler?: CountingReconciler | DefaultKnowledgeSourceReconciler;
}) {
  const sourceRepository =
    options.sourceRepository ?? new DefaultInMemoryKnowledgeSourceRepository();
  const documentRepository =
    options.documentRepository ?? new DefaultInMemoryRepository();
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const vectorIndex = new InMemoryVectorIndex();
  const defaultReconciler = new DefaultKnowledgeSourceReconciler(
    documentRepository,
    chunkRepository,
    vectorIndex,
  );
  const reconciler = options.reconciler ?? defaultReconciler;
  const pipeline = new ReconcilingSyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    options.connector,
    new DefaultKnowledgeSourceChangeDetector(),
    reconciler,
  );
  return {
    pipeline,
    sourceRepository,
    documentRepository,
    chunkRepository,
    vectorIndex,
    reconciler,
  };
}

async function assertAddsAndUpdatesDocuments(): Promise<void> {
  console.log(
    "[pipeline] reconciling sync saves added/updated documents and skips unchanged...",
  );
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository = new CountingDocumentRepository(
    new DefaultInMemoryRepository(),
  );
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: canonicalId(SOURCE_1, "keep"),
    sourceId: SOURCE_1,
    title: "Same",
    text: "Same",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: canonicalId(SOURCE_1, "change"),
    sourceId: SOURCE_1,
    title: "Old",
    text: "Old",
  });
  documentRepository.saveCalls = 0;

  const fixtures: FakeKnowledgeSourceFixture[] = [
    {
      workspaceId: WORKSPACE_A,
      sourceId: SOURCE_1,
      documents: [
        { externalId: "new", title: "New", text: "New" },
        { externalId: "keep", title: "Same", text: "Same" },
        { externalId: "change", title: "NewTitle", text: "Old" },
      ],
    },
  ];
  const { pipeline } = buildPipeline({
    sourceRepository,
    documentRepository,
    connector: new FakeKnowledgeSourceConnector(fixtures),
  });

  const result = await pipeline.sync({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_1,
  });

  assertEqual(result.status, "completed", "status");
  assertEqual(result.fetchedCount, 3, "fetchedCount");
  assertEqual(result.addedCount, 1, "addedCount");
  assertEqual(result.updatedCount, 1, "updatedCount");
  assertEqual(result.unchangedCount, 1, "unchangedCount");
  assertEqual(result.removedDocumentCount, 0, "removedDocumentCount");
  assertEqual(documentRepository.saveCalls, 2, "only added+updated saved");

  const kept = await documentRepository.findById(
    WORKSPACE_A,
    canonicalId(SOURCE_1, "keep"),
  );
  assertEqual(kept?.title, "Same", "unchanged title preserved");
  const updated = await documentRepository.findById(
    WORKSPACE_A,
    canonicalId(SOURCE_1, "change"),
  );
  assertEqual(updated?.title, "NewTitle", "updated title written");
  const added = await documentRepository.findById(
    WORKSPACE_A,
    canonicalId(SOURCE_1, "new"),
  );
  assertTruthy(added !== null, "added document present");
}

async function assertReconcilesRemovedDocuments(): Promise<void> {
  console.log(
    "[pipeline] reconciling sync reconciles removed documents via reconciler...",
  );
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository = new DefaultInMemoryRepository();
  const goneId = canonicalId(SOURCE_1, "gone");
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: goneId,
    sourceId: SOURCE_1,
    title: "Gone",
    text: "Gone",
  });
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: canonicalId(SOURCE_1, "stay"),
    sourceId: SOURCE_1,
    title: "Stay",
    text: "Stay",
  });

  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const vectorIndex = new InMemoryVectorIndex();
  const innerReconciler = new DefaultKnowledgeSourceReconciler(
    documentRepository,
    chunkRepository,
    vectorIndex,
  );
  const reconciler = new CountingReconciler(innerReconciler);
  await chunkRepository.replaceForDocument(WORKSPACE_A, goneId, [
    {
      workspaceId: WORKSPACE_A,
      id: "chunk-gone",
      documentId: goneId,
      text: "x",
      order: 0,
    },
  ]);
  await vectorIndex.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: "chunk-gone",
    vector: new Array(EMBEDDING_VECTOR_DIMENSION).fill(0),
  });

  const pipeline = new ReconcilingSyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    new FakeKnowledgeSourceConnector([
      {
        workspaceId: WORKSPACE_A,
        sourceId: SOURCE_1,
        documents: [{ externalId: "stay", title: "Stay", text: "Stay" }],
      },
    ]),
    new DefaultKnowledgeSourceChangeDetector(),
    reconciler,
  );

  const result = await pipeline.sync({
    workspaceId: WORKSPACE_A,
    sourceId: SOURCE_1,
  });

  assertEqual(reconciler.calls, 1, "reconciler called once");
  assertEqual(reconciler.lastRemovedIds.length, 1, "one removed id");
  assertEqual(reconciler.lastRemovedIds[0], goneId, "removed id matches");
  assertEqual(result.removedDocumentCount, 1, "removedDocumentCount");
  assertEqual(result.removedChunkCount, 1, "removedChunkCount");
  assertEqual(result.removedVectorCount, 1, "removedVectorCount");
  assertEqual(await documentRepository.findById(WORKSPACE_A, goneId), null, "gone");
  assertTruthy(
    (await documentRepository.findById(
      WORKSPACE_A,
      canonicalId(SOURCE_1, "stay"),
    )) !== null,
    "stay remains",
  );
}

async function assertPreWriteValidationFailureLeavesNoWrites(): Promise<void> {
  console.log(
    "[pipeline] reconciling sync rejects invalid batch with no save or reconcile...",
  );
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A);
  const documentRepository = new CountingDocumentRepository(
    new DefaultInMemoryRepository(),
  );
  const reconciler = new CountingReconciler(
    new DefaultKnowledgeSourceReconciler(
      documentRepository,
      new DefaultInMemoryDocumentChunkRepository(),
      new InMemoryVectorIndex(),
    ),
  );
  const connector = new CountingConnector([
    { externalId: "dup", title: "A", text: "a" },
    { externalId: "dup", title: "B", text: "b" },
  ]);
  const pipeline = new ReconcilingSyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    connector,
    new DefaultKnowledgeSourceChangeDetector(),
    reconciler,
  );

  await assertThrowsAsync(
    () => pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "Duplicate externalId within sync batch",
  );
  assertEqual(documentRepository.saveCalls, 0, "no saves");
  assertEqual(reconciler.calls, 0, "no reconcile");
}

async function assertRejectsSourceConflictWithNoWrites(): Promise<void> {
  console.log(
    "[pipeline] reconciling sync rejects source conflict with no save or reconcile...",
  );
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository, WORKSPACE_A, SOURCE_1);
  await registerSource(sourceRepository, WORKSPACE_A, SOURCE_2);
  const documentRepository = new CountingDocumentRepository(
    new DefaultInMemoryRepository(),
  );
  const conflictId = canonicalId(SOURCE_1, "shared");
  await documentRepository.save({
    workspaceId: WORKSPACE_A,
    id: conflictId,
    sourceId: SOURCE_2,
    title: "Other",
    text: "Other",
  });
  documentRepository.saveCalls = 0;

  const reconciler = new CountingReconciler(
    new DefaultKnowledgeSourceReconciler(
      documentRepository,
      new DefaultInMemoryDocumentChunkRepository(),
      new InMemoryVectorIndex(),
    ),
  );
  const pipeline = new ReconcilingSyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    new FakeKnowledgeSourceConnector([
      {
        workspaceId: WORKSPACE_A,
        sourceId: SOURCE_1,
        documents: [{ externalId: "shared", title: "A", text: "a" }],
      },
    ]),
    new DefaultKnowledgeSourceChangeDetector(),
    reconciler,
  );

  await assertThrowsAsync(
    () => pipeline.sync({ workspaceId: WORKSPACE_A, sourceId: SOURCE_1 }),
    "Canonical id already exists under a different source",
  );
  assertEqual(documentRepository.saveCalls, 0, "no saves");
  assertEqual(reconciler.calls, 0, "no reconcile");
}

function assertImportsOnlyPorts(): void {
  console.log(
    "[pipeline] ReconcilingSyncKnowledgeSourcePipeline imports only ports...",
  );
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/pipeline/ReconcilingSyncKnowledgeSourcePipeline.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbidden = [
    "DefaultInMemoryRepository",
    "FakeKnowledgeSourceConnector",
    "DefaultKnowledgeSourceChangeDetector",
    "DefaultKnowledgeSourceReconciler",
    "InMemoryVectorIndex",
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
  await assertAddsAndUpdatesDocuments();
  await assertReconcilesRemovedDocuments();
  await assertPreWriteValidationFailureLeavesNoWrites();
  await assertRejectsSourceConflictWithNoWrites();
  assertImportsOnlyPorts();
  console.log("ReconcilingSyncKnowledgeSourcePipeline validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
