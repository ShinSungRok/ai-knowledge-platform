import { readFileSync } from "node:fs";
import path from "node:path";

import { SyncKnowledgeSourceJobHandler } from "./SyncKnowledgeSourceJobHandler";
import { SyncKnowledgeSourcePipeline } from "../pipeline/SyncKnowledgeSourcePipeline";
import { FakeKnowledgeSourceConnector } from "../pipeline/FakeKnowledgeSourceConnector";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultInMemoryKnowledgeSourceRepository } from "../persistence/DefaultInMemoryKnowledgeSourceRepository";
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

function assertDependsOnlyOnSyncPipeline(): void {
  console.log("[jobs] SyncKnowledgeSourceJobHandler depends only on SyncKnowledgeSourcePipeline...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/jobs/SyncKnowledgeSourceJobHandler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../pipeline/SyncKnowledgeSourcePipeline"'),
    "Handler must import SyncKnowledgeSourcePipeline",
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

async function assertExecuteReturnsSyncResult(): Promise<void> {
  console.log("[jobs] execute delegates to pipeline.sync and returns { sourceId, fetchedCount, savedCount }...");
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
  const pipeline = new SyncKnowledgeSourcePipeline(
    sourceRepository,
    documentRepository,
    connector,
  );
  const handler = new SyncKnowledgeSourceJobHandler(pipeline);
  assertEqual(handler.type, "sync_knowledge_source", "expected sync type");

  const result = await handler.execute(sampleJob());
  assertEqual(result["sourceId"], SOURCE, "expected sourceId");
  assertEqual(result["fetchedCount"], 2, "expected fetchedCount=2");
  assertEqual(result["savedCount"], 2, "expected savedCount=2");
}

async function main(): Promise<void> {
  assertDependsOnlyOnSyncPipeline();
  await assertExecuteReturnsSyncResult();
  console.log("SyncKnowledgeSourceJobHandler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
