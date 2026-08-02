import { InMemoryWorkflowRunStore } from "./InMemoryWorkflowRunStore";
import { asWorkflowAgentId } from "./WorkflowAgentId";
import { asWorkflowRunId } from "./WorkflowRunId";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type { WorkflowRunSaveInput, WorkflowRunStore } from "./WorkflowRunStore";

const WORKSPACE_A = "workspace-a";

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

function result(overrides: Partial<WorkflowRunResult> = {}): WorkflowRunResult {
  return {
    plan: { goal: { workspaceId: WORKSPACE_A, objective: "obj" }, steps: [] },
    status: "completed",
    workflowRunId: asWorkflowRunId("run-1"),
    stepResults: [
      {
        stepId: "step-1",
        agentId: asWorkflowAgentId("agent-researcher"),
        role: "researcher",
        status: "completed",
        output: "found relevant policy text",
      },
    ],
    ...overrides,
  };
}

function sampleSave(
  overrides: Partial<WorkflowRunSaveInput> = {},
): WorkflowRunSaveInput {
  return {
    workspaceId: WORKSPACE_A,
    objective: "summarize the policy",
    result: result(),
    ...overrides,
  };
}

function buildStore(): WorkflowRunStore {
  return new InMemoryWorkflowRunStore();
}

async function assertSaveAndGetByIdHappyPath(): Promise<void> {
  console.log("[workflow] save/getById happy path...");
  const store = buildStore();
  const saved = await store.save(sampleSave());
  assertEqual(saved.workflowRunId, "run-1", "saved run id");
  assertEqual(saved.objective, "summarize the policy", "saved objective");

  const found = await store.getById(WORKSPACE_A, asWorkflowRunId("run-1"));
  assertEqual(found?.workflowRunId, "run-1", "getById hit");
  assertEqual(found?.result.status, "completed", "result carried through");

  assertEqual(
    await store.getById(WORKSPACE_A, asWorkflowRunId("missing")),
    null,
    "missing id returns null",
  );
}

async function assertDuplicateIdThrows(): Promise<void> {
  console.log("[workflow] duplicate workflow run id throws...");
  const store = buildStore();
  await store.save(sampleSave());
  await assertThrowsAsync(
    () => store.save(sampleSave()),
    "Duplicate workflow run id",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[workflow] workspace isolation...");
  const store = buildStore();
  await store.save(sampleSave({ workspaceId: "workspace-a" }));
  await store.save(sampleSave({ workspaceId: "workspace-b" }));
  assertEqual(
    (await store.getById("workspace-a", asWorkflowRunId("run-1")))
      ?.workspaceId,
    "workspace-a",
    "workspace-a has its own run",
  );
  assertEqual(
    (await store.getById("workspace-b", asWorkflowRunId("run-1")))
      ?.workspaceId,
    "workspace-b",
    "workspace-b has its own run, same run id, no collision",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[workflow] defensive copies of the stored run result...");
  const store = buildStore();
  const input = sampleSave();
  const saved = await store.save(input);

  // Mutate the caller's input and the returned record after the fact.
  (input.result.stepResults[0] as { output: string }).output = "mutated-input";
  (saved.result.stepResults[0] as { output: string }).output = "mutated-returned";

  const found = await store.getById(WORKSPACE_A, asWorkflowRunId("run-1"));
  assertEqual(
    found?.result.stepResults[0]?.output,
    "found relevant policy text",
    "stored step output unchanged by external mutation",
  );
}

async function main(): Promise<void> {
  await assertSaveAndGetByIdHappyPath();
  await assertDuplicateIdThrows();
  await assertWorkspaceIsolation();
  await assertDefensiveCopies();
  console.log("InMemory workflow run store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
