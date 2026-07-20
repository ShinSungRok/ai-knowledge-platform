import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultJobProcessor } from "./DefaultJobProcessor";
import { InMemoryJobStore } from "./InMemoryJobStore";
import { SyncKnowledgeSourceJobHandler } from "./SyncKnowledgeSourceJobHandler";
import { DefaultKnowledgeSourceChangeDetector } from "../pipeline/DefaultKnowledgeSourceChangeDetector";
import { DefaultKnowledgeSourceReconciler } from "../pipeline/DefaultKnowledgeSourceReconciler";
import { FakeKnowledgeSourceConnector } from "../pipeline/FakeKnowledgeSourceConnector";
import { ReconcilingSyncKnowledgeSourcePipeline } from "../pipeline/ReconcilingSyncKnowledgeSourcePipeline";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { JobHandler } from "./JobHandler";
import type { JobRecord } from "./JobRecord";
import type { JobStore } from "./JobStore";

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

const WORKSPACE = "workspace-a";
const SOURCE = "source-1";

async function registerSource(
  sourceRepository: DefaultInMemoryKnowledgeSourceRepository,
): Promise<void> {
  await sourceRepository.save({
    id: SOURCE,
    workspaceId: WORKSPACE,
    name: "Source 1",
  } satisfies KnowledgeSource);
}

function buildReconcilingPipeline(
  sourceRepository: DefaultInMemoryKnowledgeSourceRepository,
  documentRepository: DefaultInMemoryRepository,
  connector: FakeKnowledgeSourceConnector,
): ReconcilingSyncKnowledgeSourcePipeline {
  return new ReconcilingSyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    connector,
    new DefaultKnowledgeSourceChangeDetector(),
    new DefaultKnowledgeSourceReconciler(
      documentRepository,
      new DefaultInMemoryDocumentChunkRepository(),
      new InMemoryVectorIndex(),
    ),
  );
}

function buildSyncHandler(): SyncKnowledgeSourceJobHandler {
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const documentRepository = new DefaultInMemoryRepository();
  // register synchronously via thenable setup in callers that need data
  void registerSource(sourceRepository);
  const connector = new FakeKnowledgeSourceConnector([
    {
      workspaceId: WORKSPACE,
      sourceId: SOURCE,
      documents: [{ externalId: "ext-1", title: "Doc", text: "body" }],
    },
  ]);
  return new SyncKnowledgeSourceJobHandler(
    buildReconcilingPipeline(sourceRepository, documentRepository, connector),
  );
}

async function buildWiredSyncHandler(): Promise<{
  handler: SyncKnowledgeSourceJobHandler;
  sourceRepository: DefaultInMemoryKnowledgeSourceRepository;
}> {
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  await registerSource(sourceRepository);
  const documentRepository = new DefaultInMemoryRepository();
  const connector = new FakeKnowledgeSourceConnector([
    {
      workspaceId: WORKSPACE,
      sourceId: SOURCE,
      documents: [{ externalId: "ext-1", title: "Doc", text: "body" }],
    },
  ]);
  return {
    handler: new SyncKnowledgeSourceJobHandler(
      buildReconcilingPipeline(sourceRepository, documentRepository, connector),
    ),
    sourceRepository,
  };
}

class FailingHandler implements JobHandler {
  readonly type = "sync_knowledge_source" as const;
  public calls = 0;

  async execute(_job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    this.calls += 1;
    throw new Error("sync exploded");
  }
}

class UnknownTypeHandler implements JobHandler {
  readonly type = "reindex_knowledge_source" as const;

  async execute(_job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    return { ok: true };
  }
}

function assertDependsOnlyOnPorts(): void {
  console.log("[jobs] DefaultJobProcessor depends only on JobStore and JobHandler...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/jobs/DefaultJobProcessor.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "InMemoryJobStore",
    "SyncKnowledgeSourceJobHandler",
    "ReconcilingSyncKnowledgeSourcePipeline",
    "FakeKnowledgeSourceConnector",
    "../pipeline/",
    "../persistence/",
    "../application/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultJobProcessor.ts must not reference "${reference}"`,
    );
  }
}

function assertRejectsDuplicateHandlers(): void {
  console.log("[jobs] constructor rejects duplicate handler types...");
  const store = new InMemoryJobStore();
  try {
    new DefaultJobProcessor(store, [buildSyncHandler(), buildSyncHandler()]);
    throw new Error("expected duplicate handler throw");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes("Duplicate job handler type"),
      `unexpected: ${text}`,
    );
  }
}

async function assertCompletedPath(): Promise<void> {
  console.log("[jobs] processNext completes pending sync job via handler...");
  const store = new InMemoryJobStore();
  const { handler } = await buildWiredSyncHandler();
  const processor = new DefaultJobProcessor(store, [handler]);

  await store.enqueue({
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    sourceId: SOURCE,
    maxAttempts: 3,
  });

  const processed = await processor.processNext(WORKSPACE);
  assertTruthy(processed !== null, "expected a job");
  assertEqual(processed?.status, "completed", "expected completed");
  assertEqual(processed?.attempts, 1, "expected attempts=1");
  assertEqual(processed?.result?.["addedCount"], 1, "expected addedCount");
  assertEqual(processed?.result?.["fetchedCount"], 1, "expected fetchedCount");
  assertEqual(processed?.lastError, undefined, "expected no lastError");

  const none = await processor.processNext(WORKSPACE);
  assertEqual(none, null, "expected null when no pending jobs");
}

async function assertRetryThenFail(): Promise<void> {
  console.log("[jobs] processNext retries on handler throw until maxAttempts then fails...");
  const store = new InMemoryJobStore();
  const failing = new FailingHandler();
  const processor = new DefaultJobProcessor(store, [failing]);
  await store.enqueue({
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    sourceId: SOURCE,
    maxAttempts: 2,
  });

  const first = await processor.processNext(WORKSPACE);
  assertEqual(first?.status, "pending", "expected re-queue pending");
  assertEqual(first?.attempts, 1, "expected attempts=1");
  assertEqual(first?.lastError, "sync exploded", "expected lastError");

  const second = await processor.processNext(WORKSPACE);
  assertEqual(second?.status, "failed", "expected failed after maxAttempts");
  assertEqual(second?.attempts, 2, "expected attempts=2");
  assertEqual(failing.calls, 2, "expected two handler calls");
}

async function assertMissingHandlerFails(): Promise<void> {
  console.log("[jobs] processNext fails when no matching handler exists...");
  const store: JobStore = new InMemoryJobStore();
  const processor = new DefaultJobProcessor(store, [new UnknownTypeHandler()]);
  await store.enqueue({
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    sourceId: SOURCE,
    maxAttempts: 1,
  });
  const processed = await processor.processNext(WORKSPACE);
  assertEqual(processed?.status, "failed", "expected failed");
  assertEqual(
    processed?.lastError,
    "No handler for job type: sync_knowledge_source",
    "expected missing-handler error",
  );
}

async function assertOldestPendingFirst(): Promise<void> {
  console.log("[jobs] processNext picks smallest sequence pending job...");
  const store = new InMemoryJobStore();
  const { handler } = await buildWiredSyncHandler();
  const processor = new DefaultJobProcessor(store, [handler]);
  const first = await store.enqueue({
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    sourceId: SOURCE,
    maxAttempts: 1,
  });
  await store.enqueue({
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    sourceId: SOURCE,
    maxAttempts: 1,
  });
  const processed = await processor.processNext(WORKSPACE);
  assertEqual(processed?.id, first.id, "expected oldest pending first");
}

async function assertRejectsInvalidWorkspace(): Promise<void> {
  console.log("[jobs] processNext rejects invalid workspaceId...");
  const store = new InMemoryJobStore();
  const processor = new DefaultJobProcessor(store, []);
  await assertThrowsAsync(
    () => processor.processNext("  "),
    "workspaceId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  assertDependsOnlyOnPorts();
  assertRejectsDuplicateHandlers();
  await assertCompletedPath();
  await assertRetryThenFail();
  await assertMissingHandlerFails();
  await assertOldestPendingFirst();
  await assertRejectsInvalidWorkspace();
  console.log("DefaultJobProcessor validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
