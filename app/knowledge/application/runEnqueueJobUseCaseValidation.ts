import { readFileSync } from "node:fs";
import path from "node:path";

import {
  EnqueueJobUseCase,
  type EnqueueJobInput,
} from "./EnqueueJobUseCase";
import type { JobStore } from "../jobs/JobStore";
import type { JobEnqueueInput } from "../jobs/JobStore";
import type { JobRecord } from "../jobs/JobRecord";

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

class CountingJobStore implements JobStore {
  public enqueueCalls = 0;
  public lastInput: JobEnqueueInput | null = null;
  public nextJob: JobRecord = {
    id: "workspace-a:1",
    workspaceId: "workspace-a",
    type: "sync_knowledge_source",
    status: "pending",
    sourceId: "source-1",
    attempts: 0,
    maxAttempts: 3,
    sequence: 1,
  };

  async enqueue(input: JobEnqueueInput): Promise<JobRecord> {
    this.enqueueCalls += 1;
    this.lastInput = input;
    return { ...this.nextJob, ...input, status: "pending", attempts: 0 };
  }

  async getById(): Promise<JobRecord | null> {
    return null;
  }

  async listByWorkspace(): Promise<JobRecord[]> {
    return [];
  }

  async save(job: JobRecord): Promise<JobRecord> {
    return job;
  }
}

function sampleInput(overrides: Partial<EnqueueJobInput> = {}): EnqueueJobInput {
  return {
    workspaceId: "workspace-a",
    type: "sync_knowledge_source",
    sourceId: "source-1",
    maxAttempts: 3,
    ...overrides,
  };
}

function assertDependsOnlyOnJobStore(): void {
  console.log("[application] EnqueueJobUseCase depends only on the JobStore port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/EnqueueJobUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../jobs/JobStore"'),
    "must import JobStore",
  );
  const forbiddenReferences = [
    "InMemoryJobStore",
    "DefaultJobProcessor",
    "SyncKnowledgeSourceJobHandler",
    "../pipeline/",
    "../persistence/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `EnqueueJobUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertDelegates(): Promise<void> {
  console.log("[application] execute delegates to JobStore.enqueue...");
  const store = new CountingJobStore();
  const useCase = new EnqueueJobUseCase(store);
  const input = sampleInput({ type: "reindex_knowledge_source" });
  const result = await useCase.execute(input);
  assertEqual(store.enqueueCalls, 1, "expected one enqueue");
  assertEqual(store.lastInput?.type, "reindex_knowledge_source", "expected type");
  assertEqual(result.type, "reindex_knowledge_source", "expected result type");
}

async function assertRejectsInvalid(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling store...");
  const store = new CountingJobStore();
  const useCase = new EnqueueJobUseCase(store);
  await assertThrowsAsync(
    () => useCase.execute(null as unknown as EnqueueJobInput),
    "EnqueueJobInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ workspaceId: "  " })),
    "EnqueueJobInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ maxAttempts: 0 })),
    "EnqueueJobInput.maxAttempts must be a positive integer",
  );
  assertEqual(store.enqueueCalls, 0, "expected no enqueue");
}

async function main(): Promise<void> {
  assertDependsOnlyOnJobStore();
  await assertDelegates();
  await assertRejectsInvalid();
  console.log("EnqueueJobUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
