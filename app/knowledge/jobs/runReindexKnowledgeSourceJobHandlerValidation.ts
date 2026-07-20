import { readFileSync } from "node:fs";
import path from "node:path";

import { ReindexKnowledgeSourceJobHandler } from "./ReindexKnowledgeSourceJobHandler";
import { DefaultJobProcessor } from "./DefaultJobProcessor";
import { InMemoryJobStore } from "./InMemoryJobStore";
import type { RechunkKnowledgeSourcePipeline } from "../pipeline/RechunkKnowledgeSourcePipeline";
import type { ReindexKnowledgeSourceEmbeddingsPipeline } from "../pipeline/ReindexKnowledgeSourceEmbeddingsPipeline";
import type { RechunkKnowledgeSourceInput } from "../pipeline/RechunkKnowledgeSourcePipeline";
import type { RechunkKnowledgeSourceResult } from "../pipeline/RechunkKnowledgeSourcePipeline";
import type { ReindexKnowledgeSourceEmbeddingsInput } from "../pipeline/ReindexKnowledgeSourceEmbeddingsPipeline";
import type { ReindexKnowledgeSourceEmbeddingsResult } from "../pipeline/ReindexKnowledgeSourceEmbeddingsPipeline";
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

class FakeRechunkPipeline {
  public calls = 0;
  public callLog: string[] = [];
  public nextError: Error | null = null;
  public nextResult: RechunkKnowledgeSourceResult = {
    sourceId: "source-1",
    processedDocumentCount: 2,
    savedChunkCount: 4,
  };

  async rechunk(
    input: RechunkKnowledgeSourceInput,
  ): Promise<RechunkKnowledgeSourceResult> {
    this.calls += 1;
    this.callLog.push(`rechunk:${input.workspaceId}:${input.sourceId}`);
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
    return { ...this.nextResult, sourceId: input.sourceId };
  }
}

class FakeReindexPipeline {
  public calls = 0;
  public callLog: string[] = [];
  public nextResult: ReindexKnowledgeSourceEmbeddingsResult = {
    sourceId: "source-1",
    processedDocumentCount: 2,
    embeddedChunkCount: 4,
  };

  async reindex(
    input: ReindexKnowledgeSourceEmbeddingsInput,
  ): Promise<ReindexKnowledgeSourceEmbeddingsResult> {
    this.calls += 1;
    this.callLog.push(`reindex:${input.workspaceId}:${input.sourceId}`);
    return { ...this.nextResult, sourceId: input.sourceId };
  }
}

function sampleJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "workspace-a:1",
    workspaceId: "workspace-a",
    type: "reindex_knowledge_source",
    status: "running",
    sourceId: "source-1",
    attempts: 0,
    maxAttempts: 3,
    sequence: 1,
    ...overrides,
  };
}

function assertDependsOnlyOnPipelines(): void {
  console.log("[jobs] ReindexKnowledgeSourceJobHandler depends only on rechunk/reindex pipelines...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/jobs/ReindexKnowledgeSourceJobHandler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../pipeline/RechunkKnowledgeSourcePipeline"'),
    "must import RechunkKnowledgeSourcePipeline",
  );
  assertTruthy(
    source.includes(
      'from "../pipeline/ReindexKnowledgeSourceEmbeddingsPipeline"',
    ),
    "must import ReindexKnowledgeSourceEmbeddingsPipeline",
  );
  const forbiddenReferences = [
    "SyncKnowledgeSourcePipeline",
    "InMemoryJobStore",
    "DefaultJobProcessor",
    "../persistence/",
    "../application/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ReindexKnowledgeSourceJobHandler.ts must not reference "${reference}"`,
    );
  }
}

async function assertRechunkThenReindexOrdering(): Promise<void> {
  console.log("[jobs] execute calls rechunk then reindex and maps result fields...");
  const rechunk = new FakeRechunkPipeline();
  const reindex = new FakeReindexPipeline();
  const handler = new ReindexKnowledgeSourceJobHandler(
    rechunk as unknown as RechunkKnowledgeSourcePipeline,
    reindex as unknown as ReindexKnowledgeSourceEmbeddingsPipeline,
  );
  assertEqual(handler.type, "reindex_knowledge_source", "expected reindex type");

  const result = await handler.execute(sampleJob());
  assertEqual(
    [...rechunk.callLog, ...reindex.callLog].join("|"),
    "rechunk:workspace-a:source-1|reindex:workspace-a:source-1",
    "expected rechunk-then-reindex order",
  );
  assertEqual(result["sourceId"], "source-1", "expected sourceId");
  assertEqual(result["rechunkedDocumentCount"], 2, "expected rechunkedDocumentCount");
  assertEqual(result["savedChunkCount"], 4, "expected savedChunkCount");
  assertEqual(result["reindexedDocumentCount"], 2, "expected reindexedDocumentCount");
  assertEqual(result["embeddedChunkCount"], 4, "expected embeddedChunkCount");
}

async function assertRechunkFailureShortCircuits(): Promise<void> {
  console.log("[jobs] execute does not call reindex when rechunk throws...");
  const rechunk = new FakeRechunkPipeline();
  rechunk.nextError = new Error("rechunk failed");
  const reindex = new FakeReindexPipeline();
  const handler = new ReindexKnowledgeSourceJobHandler(
    rechunk as unknown as RechunkKnowledgeSourcePipeline,
    reindex as unknown as ReindexKnowledgeSourceEmbeddingsPipeline,
  );
  await assertThrowsAsync(
    () => handler.execute(sampleJob()),
    "rechunk failed",
  );
  assertEqual(rechunk.calls, 1, "expected one rechunk call");
  assertEqual(reindex.calls, 0, "expected no reindex call");
}

async function assertProcessorCompletesReindexJob(): Promise<void> {
  console.log("[jobs] DefaultJobProcessor completes a reindex job via ReindexKnowledgeSourceJobHandler...");
  const store = new InMemoryJobStore();
  const rechunk = new FakeRechunkPipeline();
  const reindex = new FakeReindexPipeline();
  const handler = new ReindexKnowledgeSourceJobHandler(
    rechunk as unknown as RechunkKnowledgeSourcePipeline,
    reindex as unknown as ReindexKnowledgeSourceEmbeddingsPipeline,
  );
  const processor = new DefaultJobProcessor(store, [handler]);
  await store.enqueue({
    workspaceId: "workspace-a",
    type: "reindex_knowledge_source",
    sourceId: "source-1",
    maxAttempts: 1,
  });
  const processed = await processor.processNext("workspace-a");
  assertEqual(processed?.status, "completed", "expected completed");
  assertEqual(processed?.result?.["savedChunkCount"], 4, "expected mapped result");
}

async function main(): Promise<void> {
  assertDependsOnlyOnPipelines();
  await assertRechunkThenReindexOrdering();
  await assertRechunkFailureShortCircuits();
  await assertProcessorCompletesReindexJob();
  console.log("ReindexKnowledgeSourceJobHandler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
