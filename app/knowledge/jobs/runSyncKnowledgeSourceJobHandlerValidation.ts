import { readFileSync } from "node:fs";
import path from "node:path";

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
import type { JobRecord } from "./JobRecord";

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

const WORKSPACE = "workspace-a";
const SOURCE = "source-1";

async function registerSource(
  sourceRepository: DefaultInMemoryKnowledgeSourceRepository,
): Promise<void> {
  const source: KnowledgeSource = {
    id: SOURCE,
    workspaceId: WORKSPACE,
    name: "Source 1",
  };
  await sourceRepository.save(source);
}

function sampleJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: `${WORKSPACE}:1`,
    workspaceId: WORKSPACE,
    type: "sync_knowledge_source",
    status: "running",
    sourceId: SOURCE,
    attempts: 0,
    maxAttempts: 3,
    sequence: 1,
    ...overrides,
  };
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

function assertDependsOnlyOnReconcilingPipeline(): void {
  console.log(
    "[jobs] SyncKnowledgeSourceJobHandler depends only on ReconcilingSyncKnowledgeSourcePipeline...",
  );
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/jobs/SyncKnowledgeSourceJobHandler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes(
      'from "../pipeline/ReconcilingSyncKnowledgeSourcePipeline"',
    ),
    "Handler must import ReconcilingSyncKnowledgeSourcePipeline",
  );
  assertTruthy(
    !source.includes('from "../pipeline/SyncKnowledgeSourcePipeline"'),
    "Handler must not import legacy SyncKnowledgeSourcePipeline",
  );
  const forbiddenReferences = [
    "FakeKnowledgeSourceConnector",
    "DefaultInMemoryRepository",
    "InMemoryJobStore",
    "DefaultJobProcessor",
    "../persistence/",
    "../application/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `SyncKnowledgeSourceJobHandler.ts must not reference "${reference}"`,
    );
  }
}

async function assertExecuteReturnsLifecycleSummary(): Promise<void> {
  console.log(
    "[jobs] execute returns reconciling sync lifecycle summary fields...",
  );
  const sourceRepository = new DefaultInMemoryKnowledgeSourceRepository();
  const documentRepository = new DefaultInMemoryRepository();
  await registerSource(sourceRepository);
  const connector = new FakeKnowledgeSourceConnector([
    {
      workspaceId: WORKSPACE,
      sourceId: SOURCE,
      documents: [
        { externalId: "ext-1", title: "Doc 1", text: "hello world" },
        { externalId: "ext-2", title: "Doc 2", text: "more text" },
      ],
    },
  ]);
  const pipeline = buildReconcilingPipeline(
    sourceRepository,
    documentRepository,
    connector,
  );
  const handler = new SyncKnowledgeSourceJobHandler(pipeline);
  assertEqual(handler.type, "sync_knowledge_source", "expected sync type");

  const result = await handler.execute(sampleJob());
  assertEqual(result["sourceId"], SOURCE, "expected sourceId");
  assertEqual(result["fetchedCount"], 2, "expected fetchedCount=2");
  assertEqual(result["addedCount"], 2, "expected addedCount=2");
  assertEqual(result["updatedCount"], 0, "expected updatedCount=0");
  assertEqual(result["unchangedCount"], 0, "expected unchangedCount=0");
  assertEqual(result["removedDocumentCount"], 0, "expected removedDocumentCount=0");
  assertEqual(result["removedChunkCount"], 0, "expected removedChunkCount=0");
  assertEqual(result["removedVectorCount"], 0, "expected removedVectorCount=0");
  assertEqual(result["savedCount"], undefined, "legacy savedCount must be absent");
}

async function main(): Promise<void> {
  assertDependsOnlyOnReconcilingPipeline();
  await assertExecuteReturnsLifecycleSummary();
  console.log("SyncKnowledgeSourceJobHandler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
