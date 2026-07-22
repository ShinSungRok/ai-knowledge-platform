import { asWorkflowAgentId } from "./WorkflowAgentId";
import { DefaultWorkflowHandoffBuilder } from "./DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "./DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "./DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
import { InMemoryWorkflowMemoryStore } from "./InMemoryWorkflowMemoryStore";
import { asWorkflowRunId } from "./WorkflowRunId";
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
  memory: InMemoryWorkflowMemoryStore = new InMemoryWorkflowMemoryStore(),
): WorkflowOrchestrator {
  const planner: WorkflowPlanner = new DeterministicWorkflowPlanner(registry);
  return new DefaultWorkflowOrchestrator(
    planner,
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("run-fixed-orchestrator"),
  );
}

async function assertSuccessfulRun(): Promise<void> {
  console.log(
    "[workflow] successful orchestrator run (researcher→synthesizer→critic)...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = buildOrchestrator(registry, invoker, memory);

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

  const objective = "summarize the policy";
  const step0Out = `echo:researcher:${objective}`;
  const step1Out = `echo:synthesizer:${step0Out}`;
  const step2Out = `echo:critic:${step1Out}`;

  assertEqual(invoker.calls[0]?.input, objective, "step0 uses objective");
  assertEqual(invoker.calls[1]?.input, step0Out, "step1 uses handoff payload");
  assertEqual(invoker.calls[2]?.input, step1Out, "step2 uses handoff payload");
  assertEqual(result.stepResults[0]?.output, step0Out, "step0 output");
  assertEqual(result.stepResults[1]?.output, step1Out, "step1 output");
  assertEqual(result.stepResults[2]?.output, step2Out, "step2 output");
  assertEqual(
    result.stepResults[0]?.handoff,
    undefined,
    "step0 has no handoff",
  );
  assertEqual(
    result.stepResults[1]?.handoff?.kind,
    "sequential",
    "step1 sequential handoff",
  );
  assertEqual(
    result.stepResults[2]?.handoff?.kind,
    "sequential",
    "step2 sequential handoff",
  );

  assertEqual(
    String(result.workflowRunId),
    "run-fixed-orchestrator",
    "workflowRunId on result",
  );
  const entries = await memory.listByRun(
    "workspace-a",
    result.workflowRunId,
  );
  assertEqual(entries.length, 6, "objective + 2 handoffs + 3 step_outputs");
  assertEqual(entries[0]?.kind, "objective", "mem objective");
  assertEqual(entries[0]?.content, objective, "mem objective content");
  assertEqual(entries[1]?.kind, "step_output", "mem step0");
  assertEqual(entries[2]?.kind, "handoff", "mem handoff1");
  assertEqual(entries[3]?.kind, "step_output", "mem step1");
  assertEqual(entries[4]?.kind, "handoff", "mem handoff2");
  assertEqual(entries[5]?.kind, "step_output", "mem step2");
  assertEqual(
    entries.map((entry) => entry.sequence).join(","),
    "1,2,3,4,5,6",
    "memory sequence order",
  );
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
  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = buildOrchestrator(registry, invoker, memory);

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

  const entries = await memory.listByRun(
    "workspace-a",
    result.workflowRunId,
  );
  const kinds = entries.map((entry) => entry.kind);
  assertTruthy(kinds.includes("objective"), "objective present on failure");
  assertTruthy(kinds.includes("step_output"), "completed step_output present");
  assertTruthy(kinds.includes("handoff"), "handoff before failed invoke");
  assertEqual(
    kinds.filter((kind) => kind === "step_output").length,
    1,
    "only completed step has step_output",
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
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-fixed-direct"),
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
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-fixed-direct"),
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
