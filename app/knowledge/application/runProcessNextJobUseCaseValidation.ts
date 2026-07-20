import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ProcessNextJobUseCase,
  type ProcessNextJobInput,
} from "./ProcessNextJobUseCase";
import type { JobProcessor } from "../jobs/JobProcessor";
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

class CountingJobProcessor implements JobProcessor {
  public processCalls = 0;
  public lastWorkspaceId: string | null = null;
  public nextResult: JobRecord | null = {
    id: "workspace-a:1",
    workspaceId: "workspace-a",
    type: "sync_knowledge_source",
    status: "completed",
    sourceId: "source-1",
    attempts: 1,
    maxAttempts: 3,
    sequence: 1,
    result: { savedCount: 1 },
  };

  async processNext(workspaceId: string): Promise<JobRecord | null> {
    this.processCalls += 1;
    this.lastWorkspaceId = workspaceId;
    return this.nextResult;
  }
}

function assertDependsOnlyOnJobProcessor(): void {
  console.log("[application] ProcessNextJobUseCase depends only on the JobProcessor port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/ProcessNextJobUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../jobs/JobProcessor"'),
    "must import JobProcessor",
  );
  const forbiddenReferences = [
    "DefaultJobProcessor",
    "InMemoryJobStore",
    "EnqueueJobUseCase",
    "../pipeline/",
    "../persistence/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `ProcessNextJobUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertDelegates(): Promise<void> {
  console.log("[application] execute delegates to JobProcessor.processNext...");
  const processor = new CountingJobProcessor();
  const useCase = new ProcessNextJobUseCase(processor);
  const result = await useCase.execute({ workspaceId: "workspace-a" });
  assertEqual(processor.processCalls, 1, "expected one processNext");
  assertEqual(processor.lastWorkspaceId, "workspace-a", "expected workspace");
  assertEqual(result, processor.nextResult, "expected unchanged result");
}

async function assertRejectsInvalid(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling processor...");
  const processor = new CountingJobProcessor();
  const useCase = new ProcessNextJobUseCase(processor);
  await assertThrowsAsync(
    () => useCase.execute(null as unknown as ProcessNextJobInput),
    "ProcessNextJobInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute({ workspaceId: "  " }),
    "ProcessNextJobInput.workspaceId must be a non-empty string",
  );
  assertEqual(processor.processCalls, 0, "expected no processNext");
}

async function main(): Promise<void> {
  assertDependsOnlyOnJobProcessor();
  await assertDelegates();
  await assertRejectsInvalid();
  console.log("ProcessNextJobUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
