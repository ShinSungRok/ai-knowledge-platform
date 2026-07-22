import { asWorkflowAgentId } from "./WorkflowAgentId";
import { InMemoryWorkflowMemoryStore } from "./InMemoryWorkflowMemoryStore";
import type { WorkflowMemoryStore } from "./WorkflowMemoryStore";
import { asWorkflowRunId } from "./WorkflowRunId";

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

function buildStore(): WorkflowMemoryStore & { clear(): void } {
  return new InMemoryWorkflowMemoryStore();
}

async function assertAppendListOrdering(): Promise<void> {
  console.log("[workflow-memory] append/list ordering...");
  const store = buildStore();
  const runId = asWorkflowRunId("run-a");
  await store.append({
    workspaceId: "workspace-a",
    workflowRunId: runId,
    kind: "objective",
    content: "do the thing",
  });
  await store.append({
    workspaceId: "workspace-a",
    workflowRunId: runId,
    kind: "step_output",
    content: "out-1",
    agentId: asWorkflowAgentId("agent-1"),
    stepId: "step-1",
  });
  await store.append({
    workspaceId: "workspace-a",
    workflowRunId: runId,
    kind: "handoff",
    content: "payload",
    handoffKind: "sequential",
  });

  const listed = await store.listByRun("workspace-a", runId);
  assertEqual(listed.length, 3, "three entries");
  assertEqual(listed[0]?.sequence, 1, "seq 1");
  assertEqual(listed[1]?.sequence, 2, "seq 2");
  assertEqual(listed[2]?.sequence, 3, "seq 3");
  assertEqual(listed[0]?.kind, "objective", "kind objective");
  assertEqual(listed[1]?.kind, "step_output", "kind step_output");
  assertEqual(listed[2]?.kind, "handoff", "kind handoff");
  assertEqual(
    listed[0]?.id,
    "workspace-a:run-a:1",
    "deterministic id",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[workflow-memory] cross-workspace isolation...");
  const store = buildStore();
  const runId = asWorkflowRunId("shared-run-id");
  await store.append({
    workspaceId: "workspace-a",
    workflowRunId: runId,
    kind: "note",
    content: "a-only",
  });
  await store.append({
    workspaceId: "workspace-b",
    workflowRunId: runId,
    kind: "note",
    content: "b-only",
  });
  const a = await store.listByRun("workspace-a", runId);
  const b = await store.listByRun("workspace-b", runId);
  assertEqual(a.length, 1, "workspace-a one entry");
  assertEqual(b.length, 1, "workspace-b one entry");
  assertEqual(a[0]?.content, "a-only", "a content");
  assertEqual(b[0]?.content, "b-only", "b content");
}

async function assertEmptyFieldsThrow(): Promise<void> {
  console.log("[workflow-memory] empty fields throw...");
  const store = buildStore();
  const runId = asWorkflowRunId("run-empty");
  await assertThrowsAsync(
    () =>
      store.append({
        workspaceId: "  ",
        workflowRunId: runId,
        kind: "note",
        content: "x",
      }),
    "workspaceId",
  );
  await assertThrowsAsync(
    () =>
      store.append({
        workspaceId: "workspace-a",
        workflowRunId: asWorkflowRunId("run-empty"),
        kind: "note",
        content: "  ",
      }),
    "content",
  );
  try {
    asWorkflowRunId("  ");
    throw new Error("expected WorkflowRunId throw");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(text.includes("WorkflowRunId"), `unexpected: ${text}`);
  }
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[workflow-memory] defensive copies on list...");
  const store = buildStore();
  const runId = asWorkflowRunId("run-copy");
  await store.append({
    workspaceId: "workspace-a",
    workflowRunId: runId,
    kind: "note",
    content: "keep",
  });
  const listed = [...(await store.listByRun("workspace-a", runId))];
  const first = listed[0];
  assertTruthy(first !== undefined, "expected entry");
  (first as { content: string }).content = "mutated";
  listed.pop();
  const again = await store.listByRun("workspace-a", runId);
  assertEqual(again.length, 1, "store length unchanged");
  assertEqual(again[0]?.content, "keep", "content unchanged");
}

async function assertUnknownRunEmpty(): Promise<void> {
  console.log("[workflow-memory] unknown run returns empty...");
  const store = buildStore();
  const listed = await store.listByRun(
    "workspace-a",
    asWorkflowRunId("missing-run"),
  );
  assertEqual(listed.length, 0, "empty");
}

async function main(): Promise<void> {
  await assertAppendListOrdering();
  await assertWorkspaceIsolation();
  await assertEmptyFieldsThrow();
  await assertDefensiveCopies();
  await assertUnknownRunEmpty();
  console.log("InMemory workflow memory store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
