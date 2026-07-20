import { InMemoryJobStore } from "./InMemoryJobStore";
import type { JobStore } from "./JobStore";
import type { JobEnqueueInput } from "./JobStore";
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

function sampleEnqueue(overrides: Partial<JobEnqueueInput> = {}): JobEnqueueInput {
  return {
    workspaceId: "workspace-a",
    type: "sync_knowledge_source",
    sourceId: "source-1",
    maxAttempts: 3,
    ...overrides,
  };
}

function buildStore(): JobStore {
  return new InMemoryJobStore();
}

async function assertEnqueueAndListOrdering(): Promise<void> {
  console.log("[jobs] enqueue assigns deterministic id/sequence; listByWorkspace returns sequence ascending...");
  const store = buildStore();
  const first = await store.enqueue(sampleEnqueue({ sourceId: "s1" }));
  const second = await store.enqueue(
    sampleEnqueue({ type: "reindex_knowledge_source", sourceId: "s2" }),
  );

  assertEqual(first.sequence, 1, "expected first sequence=1");
  assertEqual(first.id, "workspace-a:1", "expected deterministic id");
  assertEqual(first.status, "pending", "expected pending");
  assertEqual(first.attempts, 0, "expected attempts=0");
  assertEqual(second.sequence, 2, "expected second sequence=2");
  assertEqual(second.id, "workspace-a:2", "expected second id");

  const listed = await store.listByWorkspace("workspace-a");
  assertEqual(listed.map((j) => j.sequence).join(","), "1,2", "expected ascending");
}

async function assertGetByIdAndSave(): Promise<void> {
  console.log("[jobs] getById returns workspace-scoped job; save replaces existing...");
  const store = buildStore();
  const enqueued = await store.enqueue(sampleEnqueue());
  const found = await store.getById("workspace-a", enqueued.id);
  assertEqual(found?.id, enqueued.id, "expected getById hit");
  assertEqual(
    await store.getById("workspace-a", "missing"),
    null,
    "expected null for missing",
  );
  assertEqual(
    await store.getById("workspace-b", enqueued.id),
    null,
    "expected null for other workspace",
  );

  const updated: JobRecord = {
    ...enqueued,
    status: "running",
    attempts: 1,
  };
  const saved = await store.save(updated);
  assertEqual(saved.status, "running", "expected saved status");
  const listed = await store.listByWorkspace("workspace-a");
  assertEqual(listed[0]?.status, "running", "expected replaced status");
  assertEqual(listed[0]?.attempts, 1, "expected replaced attempts");

  await assertThrowsAsync(
    () =>
      store.save({
        ...enqueued,
        id: "workspace-a:999",
      }),
    "Unknown job id",
  );
}

async function assertWorkspaceIsolationAndDefensiveCopy(): Promise<void> {
  console.log("[jobs] workspace isolation and defensive copies...");
  const store = buildStore();
  await store.enqueue(sampleEnqueue({ workspaceId: "workspace-a", sourceId: "a" }));
  await store.enqueue(sampleEnqueue({ workspaceId: "workspace-b", sourceId: "b" }));
  const a = await store.listByWorkspace("workspace-a");
  const b = await store.listByWorkspace("workspace-b");
  assertEqual(a.length, 1, "expected one in a");
  assertEqual(b.length, 1, "expected one in b");
  assertEqual(a[0]?.id, "workspace-a:1", "expected a id");
  assertEqual(b[0]?.id, "workspace-b:1", "expected b id");

  const empty = await store.listByWorkspace("workspace-empty");
  assertEqual(empty.length, 0, "expected empty list");

  const job = await store.enqueue(sampleEnqueue({ sourceId: "mut" }));
  job.status = "failed";
  const listed = await store.listByWorkspace("workspace-a");
  const stored = listed.find((j) => j.sourceId === "mut");
  assertEqual(stored?.status, "pending", "expected stored status unchanged");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[jobs] enqueue rejects invalid input...");
  const store = buildStore();
  await assertThrowsAsync(
    () => store.enqueue(null as unknown as JobEnqueueInput),
    "JobEnqueueInput must be an object",
  );
  await assertThrowsAsync(
    () => store.enqueue(sampleEnqueue({ workspaceId: "  " })),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => store.enqueue(sampleEnqueue({ sourceId: "" })),
    "sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      store.enqueue(
        sampleEnqueue({ type: "other" as unknown as JobEnqueueInput["type"] }),
      ),
    'JobEnqueueInput.type must be "sync_knowledge_source" | "reindex_knowledge_source"',
  );
  await assertThrowsAsync(
    () => store.enqueue(sampleEnqueue({ maxAttempts: 0 })),
    "JobEnqueueInput.maxAttempts must be a positive integer",
  );
}

async function main(): Promise<void> {
  await assertEnqueueAndListOrdering();
  await assertGetByIdAndSave();
  await assertWorkspaceIsolationAndDefensiveCopy();
  await assertRejectsInvalidInput();
  console.log("InMemoryJobStore validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
