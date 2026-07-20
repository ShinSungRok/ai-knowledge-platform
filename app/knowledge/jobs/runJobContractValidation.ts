import { KNOWLEDGE_MODULE_JOBS } from "./index";
import type { JobStore } from "./JobStore";
import type { JobEnqueueInput } from "./JobStore";
import type { JobRecord } from "./JobRecord";
import type { JobHandler } from "./JobHandler";
import type { JobProcessor } from "./JobProcessor";
import type {
  JobStore as TopLevelJobStore,
  JobHandler as TopLevelJobHandler,
  JobProcessor as TopLevelJobProcessor,
} from "../index";

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

class FakeJobStore implements JobStore {
  private readonly jobs: JobRecord[] = [];

  async enqueue(input: JobEnqueueInput): Promise<JobRecord> {
    const sequence = this.jobs.filter((j) => j.workspaceId === input.workspaceId)
      .length + 1;
    const job: JobRecord = {
      id: `${input.workspaceId}:${sequence}`,
      workspaceId: input.workspaceId,
      type: input.type,
      status: "pending",
      sourceId: input.sourceId,
      attempts: 0,
      maxAttempts: input.maxAttempts,
      sequence,
    };
    this.jobs.push(job);
    return job;
  }

  async getById(workspaceId: string, jobId: string): Promise<JobRecord | null> {
    return (
      this.jobs.find((j) => j.workspaceId === workspaceId && j.id === jobId) ??
      null
    );
  }

  async listByWorkspace(workspaceId: string): Promise<JobRecord[]> {
    return this.jobs.filter((j) => j.workspaceId === workspaceId);
  }

  async save(job: JobRecord): Promise<JobRecord> {
    const index = this.jobs.findIndex(
      (j) => j.workspaceId === job.workspaceId && j.id === job.id,
    );
    if (index < 0) {
      throw new Error("job not found");
    }
    this.jobs[index] = job;
    return job;
  }
}

class FakeJobHandler implements JobHandler {
  readonly type = "sync_knowledge_source" as const;

  async execute(job: JobRecord): Promise<Readonly<Record<string, unknown>>> {
    return { sourceId: job.sourceId, fetchedCount: 0, savedCount: 0 };
  }
}

class FakeJobProcessor implements JobProcessor {
  constructor(
    private readonly store: JobStore,
    private readonly handler: JobHandler,
  ) {}

  async processNext(workspaceId: string): Promise<JobRecord | null> {
    const pending = (await this.store.listByWorkspace(workspaceId)).find(
      (j) => j.status === "pending",
    );
    if (!pending) {
      return null;
    }
    const running: JobRecord = { ...pending, status: "running" };
    await this.store.save(running);
    const result = await this.handler.execute(running);
    const completed: JobRecord = {
      ...running,
      status: "completed",
      attempts: running.attempts + 1,
      result,
    };
    return this.store.save(completed);
  }
}

function assertModuleConstant(): void {
  console.log("[jobs] KNOWLEDGE_MODULE_JOBS constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_JOBS,
    "app/knowledge/jobs",
    "unexpected KNOWLEDGE_MODULE_JOBS value",
  );
}

async function assertPortsImplementable(): Promise<void> {
  console.log("[jobs] port contracts (JobStore/JobHandler/JobProcessor) are implementable and callable...");
  const store: JobStore = new FakeJobStore();
  const handler: JobHandler = new FakeJobHandler();
  const processor: JobProcessor = new FakeJobProcessor(store, handler);

  const enqueued = await store.enqueue({
    workspaceId: "workspace-a",
    type: "sync_knowledge_source",
    sourceId: "source-1",
    maxAttempts: 3,
  });

  assertEqual(enqueued.status, "pending", "expected pending status");
  assertEqual(enqueued.attempts, 0, "expected attempts=0");
  assertEqual(enqueued.type, "sync_knowledge_source", "expected sync type");
  assertEqual(typeof enqueued.id, "string", "expected id string");
  assertEqual(typeof enqueued.sequence, "number", "expected sequence number");

  const processed = await processor.processNext("workspace-a");
  assertTruthy(processed !== null, "expected a processed job");
  assertEqual(processed?.status, "completed", "expected completed status");
  assertEqual(processed?.result?.["sourceId"], "source-1", "expected result.sourceId");
}

function assertTopLevelBarrelReExports(): void {
  console.log("[jobs] top-level app/knowledge barrel re-exports the jobs port types...");
  const _store: TopLevelJobStore = null as unknown as JobStore;
  const _handler: TopLevelJobHandler = null as unknown as JobHandler;
  const _processor: TopLevelJobProcessor = null as unknown as JobProcessor;
  void _store;
  void _handler;
  void _processor;
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertPortsImplementable();
  assertTopLevelBarrelReExports();
  console.log("Job contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
