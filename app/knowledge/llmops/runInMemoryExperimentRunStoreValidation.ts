import { asExperimentId } from "./ExperimentId";
import { asExperimentRunId } from "./ExperimentRunId";
import { InMemoryExperimentRunStore } from "./InMemoryExperimentRunStore";
import type { ExperimentRunCreateInput } from "./ExperimentRunStore";
import type { ExperimentRunStore } from "./ExperimentRunStore";

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

function sampleCreate(
  overrides: Partial<ExperimentRunCreateInput> = {},
): ExperimentRunCreateInput {
  const {
    id: overrideId,
    experimentId: overrideExperimentId,
    workspaceId,
    params,
    status,
    metrics,
    startedAtUnixMs,
    endedAtUnixMs,
    error,
  } = overrides;
  const input: ExperimentRunCreateInput = {
    id: asExperimentRunId(
      typeof overrideId === "string" ? overrideId : "run-1",
    ),
    experimentId: asExperimentId(
      typeof overrideExperimentId === "string"
        ? overrideExperimentId
        : "exp-1",
    ),
    workspaceId: workspaceId ?? "workspace-a",
    params: params ?? { model: "fake" },
  };
  if (status !== undefined) {
    input.status = status;
  }
  if (metrics !== undefined) {
    input.metrics = metrics;
  }
  if (startedAtUnixMs !== undefined) {
    input.startedAtUnixMs = startedAtUnixMs;
  }
  if (endedAtUnixMs !== undefined) {
    input.endedAtUnixMs = endedAtUnixMs;
  }
  if (error !== undefined) {
    input.error = error;
  }
  return input;
}

function buildStore(): ExperimentRunStore {
  return new InMemoryExperimentRunStore();
}

async function assertCreateGetListUpdateHappyPath(): Promise<void> {
  console.log("[llmops] create/get/list/updateStatus happy path...");
  const store = buildStore();
  const created = await store.create(
    sampleCreate({
      id: asExperimentRunId("run-b"),
      startedAtUnixMs: 200,
      params: { model: "a" },
    }),
  );
  assertEqual(created.status, "pending", "default status pending");
  await store.create(
    sampleCreate({
      id: asExperimentRunId("run-a"),
      startedAtUnixMs: 100,
      params: { model: "b" },
    }),
  );

  const found = await store.getById("workspace-a", asExperimentRunId("run-b"));
  assertEqual(found?.id, "run-b", "getById hit");
  assertEqual(
    await store.getById("workspace-a", asExperimentRunId("missing")),
    null,
    "missing null",
  );

  const listed = await store.listByExperiment(
    "workspace-a",
    asExperimentId("exp-1"),
  );
  assertEqual(
    listed.map((r) => r.id).join(","),
    "run-a,run-b",
    "list ordered by startedAt then id",
  );

  const running = await store.updateStatus({
    workspaceId: "workspace-a",
    runId: asExperimentRunId("run-a"),
    status: "running",
  });
  assertEqual(running.status, "running", "pending→running");
  const completed = await store.updateStatus({
    workspaceId: "workspace-a",
    runId: asExperimentRunId("run-a"),
    status: "completed",
    metrics: { latencyMs: 12 },
    endedAtUnixMs: 300,
  });
  assertEqual(completed.status, "completed", "running→completed");
  assertEqual(completed.metrics?.latencyMs, 12, "metrics set");
  assertEqual(completed.endedAtUnixMs, 300, "endedAt set");
}

async function assertDuplicateIdThrows(): Promise<void> {
  console.log("[llmops] duplicate id throws...");
  const store = buildStore();
  await store.create(sampleCreate());
  await assertThrowsAsync(
    () => store.create(sampleCreate()),
    "Duplicate experiment run id",
  );
}

async function assertInvalidTransitionThrows(): Promise<void> {
  console.log("[llmops] invalid transition throws...");
  const store = buildStore();
  await store.create(sampleCreate());
  await store.updateStatus({
    workspaceId: "workspace-a",
    runId: asExperimentRunId("run-1"),
    status: "completed",
  });
  await assertThrowsAsync(
    () =>
      store.updateStatus({
        workspaceId: "workspace-a",
        runId: asExperimentRunId("run-1"),
        status: "running",
      }),
    "Invalid experiment run status transition",
  );
  await assertThrowsAsync(
    () =>
      store.updateStatus({
        workspaceId: "workspace-a",
        runId: asExperimentRunId("missing"),
        status: "running",
      }),
    "Unknown experiment run id",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops] workspace isolation...");
  const store = buildStore();
  await store.create(sampleCreate({ workspaceId: "workspace-a" }));
  await store.create(
    sampleCreate({
      workspaceId: "workspace-b",
      id: asExperimentRunId("run-1"),
    }),
  );
  assertEqual(
    (await store.listByExperiment("workspace-a", asExperimentId("exp-1")))
      .length,
    1,
    "workspace-a list",
  );
  assertEqual(
    await store.getById("workspace-b", asExperimentRunId("run-1")) !== null,
    true,
    "workspace-b has own run",
  );
  assertEqual(
    await store.getById("workspace-a", asExperimentRunId("run-1")) !== null,
    true,
    "workspace-a has own run",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops] defensive copies of params...");
  const store = buildStore();
  const params = { model: "fake" };
  const created = await store.create(sampleCreate({ params }));
  params.model = "mutated-input";
  (created.params as { model: string }).model = "mutated-returned";
  const found = await store.getById("workspace-a", asExperimentRunId("run-1"));
  assertEqual(found?.params.model, "fake", "store params unchanged");
}

async function main(): Promise<void> {
  await assertCreateGetListUpdateHappyPath();
  await assertDuplicateIdThrows();
  await assertInvalidTransitionThrows();
  await assertWorkspaceIsolation();
  await assertDefensiveCopies();
  console.log("InMemory experiment run store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
