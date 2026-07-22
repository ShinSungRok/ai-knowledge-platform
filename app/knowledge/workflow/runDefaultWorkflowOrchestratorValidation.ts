import { asWorkflowAgentId } from "./WorkflowAgentId";
import { DefaultWorkflowOrchestrator } from "./DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "./DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "./InMemoryWorkflowAgentRegistry";
import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowOrchestrator } from "./WorkflowOrchestrator";
import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowPlanner } from "./WorkflowPlanner";

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

class FakeWorkflowAgent implements WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;

  constructor(descriptor: WorkflowAgentDescriptor) {
    this.descriptor = descriptor;
  }
}

function agent(
  id: string,
  role: WorkflowAgentRole,
  displayName: string,
): WorkflowAgent {
  return new FakeWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
}

function sampleGoal(overrides: Partial<WorkflowGoal> = {}): WorkflowGoal {
  return {
    workspaceId: "workspace-a",
    objective: "summarize the policy",
    ...overrides,
  };
}

function registerCoreTrio(
  registry: InMemoryWorkflowAgentRegistry,
): void {
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));
}

function buildOrchestrator(
  registry: InMemoryWorkflowAgentRegistry,
  invoker: FakeWorkflowAgentInvoker,
): WorkflowOrchestrator {
  const planner: WorkflowPlanner = new DeterministicWorkflowPlanner(registry);
  return new DefaultWorkflowOrchestrator(planner, registry, invoker);
}

async function assertSuccessfulRun(): Promise<void> {
  console.log(
    "[workflow] successful orchestrator run (researcher→synthesizer→critic)...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "completed", "status completed");
  assertEqual(result.stepResults.length, 3, "three step results");
  assertEqual(result.stepResults[0]?.role, "researcher", "step 1 researcher");
  assertEqual(result.stepResults[1]?.role, "synthesizer", "step 2 synthesizer");
  assertEqual(result.stepResults[2]?.role, "critic", "step 3 critic");
  assertEqual(invoker.calls.length, 3, "invoker called three times");
  assertEqual(
    invoker.calls.map((call) => String(call.agentId)).join(","),
    "agent-researcher,agent-synthesizer,agent-critic",
    "deterministic invoker call order",
  );
  for (const step of result.stepResults) {
    assertEqual(step.status, "completed", `${step.stepId} completed`);
    assertEqual(
      step.output,
      `echo:${step.role}:summarize the policy`,
      `${step.stepId} echo output`,
    );
  }
}

async function assertInvokerFailureStops(): Promise<void> {
  console.log(
    "[workflow] invoker failure on middle step stops remaining invokes...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker({
    failingAgentIds: new Set(["agent-synthesizer"]),
  });
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "failed", "status failed");
  assertEqual(result.stepResults.length, 2, "stopped after failed step");
  assertEqual(result.stepResults[0]?.status, "completed", "researcher ok");
  assertEqual(result.stepResults[1]?.status, "failed", "synthesizer failed");
  assertEqual(invoker.calls.length, 2, "critic never invoked");
  assertTruthy(
    !invoker.calls.some((call) => String(call.agentId) === "agent-critic"),
    "critic not in invoker calls",
  );
}

async function assertMissingAgentFails(): Promise<void> {
  console.log("[workflow] missing agentId fails deterministically...");
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();

  const planner: WorkflowPlanner = {
    async plan(goal: WorkflowGoal): Promise<WorkflowPlan> {
      return {
        goal,
        steps: [
          {
            id: "step-1",
            agentId: asWorkflowAgentId("missing-agent"),
            role: "researcher",
            input: goal.objective,
          },
        ],
      };
    },
  };
  const orchestrator = new DefaultWorkflowOrchestrator(
    planner,
    registry,
    invoker,
  );
  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "failed", "missing agent → failed");
  assertEqual(result.stepResults.length, 1, "one failed step");
  assertEqual(result.stepResults[0]?.status, "failed", "step failed");
  assertTruthy(
    result.stepResults[0]?.error?.includes("Unknown workflow agent id"),
    "unknown agent error",
  );
  assertEqual(invoker.calls.length, 0, "invoker not called for missing agent");
}

async function assertRoleMismatchFails(): Promise<void> {
  console.log("[workflow] role mismatch fails deterministically...");
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();

  const planner: WorkflowPlanner = {
    async plan(goal: WorkflowGoal): Promise<WorkflowPlan> {
      return {
        goal,
        steps: [
          {
            id: "step-1",
            agentId: asWorkflowAgentId("agent-researcher"),
            role: "critic",
            input: goal.objective,
          },
        ],
      };
    },
  };
  const orchestrator = new DefaultWorkflowOrchestrator(
    planner,
    registry,
    invoker,
  );
  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "failed", "role mismatch → failed");
  assertTruthy(
    result.stepResults[0]?.error?.includes("role mismatch"),
    "role mismatch error",
  );
  assertEqual(invoker.calls.length, 0, "invoker not called on mismatch");
}

async function assertEmptyGoalThrows(): Promise<void> {
  console.log("[workflow] empty goal fields throw from planner...");
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  await assertThrowsAsync(
    () => orchestrator.run(sampleGoal({ workspaceId: "  " })),
    "workspaceId",
  );
  await assertThrowsAsync(
    () => orchestrator.run(sampleGoal({ objective: "" })),
    "objective",
  );
}

async function main(): Promise<void> {
  await assertSuccessfulRun();
  await assertInvokerFailureStops();
  await assertMissingAgentFails();
  await assertRoleMismatchFails();
  await assertEmptyGoalThrows();
  console.log("Default workflow orchestrator validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
