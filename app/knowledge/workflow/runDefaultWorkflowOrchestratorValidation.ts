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
import { WORKFLOW_SKIP_ROLES_METADATA_KEY } from "./WORKFLOW_SKIP_ROLES_METADATA_KEY";

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
  // Deterministic failure retries once (MAX_STEP_INVOKE_ATTEMPTS=2) before
  // giving up: 1 researcher call + 2 synthesizer attempts.
  assertEqual(invoker.calls.length, 3, "synthesizer retried once then critic never invoked");
  assertEqual(result.stepResults[1]?.attempts, 2, "synthesizer exhausted retries");
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

async function assertRetrySucceedsOnSecondAttempt(): Promise<void> {
  console.log(
    "[workflow] transient invoke failure retries and succeeds on 2nd attempt...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  let synthesizerCallCount = 0;
  const invoker = new FakeWorkflowAgentInvoker({
    handlers: new Map([
      [
        "agent-synthesizer",
        async (input) => {
          synthesizerCallCount += 1;
          if (synthesizerCallCount === 1) {
            return { ok: false, output: "", error: "transient failure" };
          }
          return { ok: true, output: `echo:${input.role}:${input.input}` };
        },
      ],
    ]),
  });
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "completed", "status completed after retry");
  assertEqual(result.stepResults[1]?.status, "completed", "synthesizer completed");
  assertEqual(result.stepResults[1]?.attempts, 2, "synthesizer attempts recorded");
  assertEqual(result.stepResults[0]?.attempts, undefined, "no attempts field when first try succeeds");
  assertEqual(
    invoker.calls.length,
    4,
    "researcher + 2 synthesizer attempts + critic",
  );
}

async function assertSkipRoleProducesPartialStatus(): Promise<void> {
  console.log(
    "[workflow] skipRoles metadata skips critic and yields partial status...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(
    sampleGoal({ metadata: { [WORKFLOW_SKIP_ROLES_METADATA_KEY]: "critic" } }),
  );
  assertEqual(result.status, "partial", "partial status");
  assertEqual(result.stepResults.length, 3, "three step results");
  assertEqual(result.stepResults[0]?.status, "completed", "researcher completed");
  assertEqual(result.stepResults[1]?.status, "completed", "synthesizer completed");
  assertEqual(result.stepResults[2]?.status, "skipped", "critic skipped");
  assertEqual(result.stepResults[2]?.output, "", "skipped step has empty output");
  assertEqual(invoker.calls.length, 2, "critic never invoked when skipped");
  assertTruthy(result.summary?.includes("skipped"), "summary mentions skipped");
}

async function assertSkipInMiddleStillHandoffsFromLastCompleted(): Promise<void> {
  console.log(
    "[workflow] skipping a middle step still builds handoff from the last completed step...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  registry.register(agent("agent-executor", "executor", "Executor"));
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(
    sampleGoal({
      metadata: { [WORKFLOW_SKIP_ROLES_METADATA_KEY]: "synthesizer" },
    }),
  );
  assertEqual(result.status, "partial", "partial status");
  assertEqual(result.stepResults.length, 4, "four step results");
  assertEqual(result.stepResults[0]?.role, "researcher", "step0 researcher");
  assertEqual(result.stepResults[1]?.role, "synthesizer", "step1 synthesizer");
  assertEqual(result.stepResults[1]?.status, "skipped", "synthesizer skipped");
  assertEqual(result.stepResults[2]?.role, "critic", "step2 critic");
  assertEqual(result.stepResults[2]?.status, "completed", "critic completed");
  assertEqual(result.stepResults[3]?.role, "executor", "step3 executor");
  assertEqual(result.stepResults[3]?.status, "completed", "executor completed");

  const objective = "summarize the policy";
  const researcherOut = `echo:researcher:${objective}`;
  assertEqual(
    result.stepResults[2]?.handoff?.fromAgentId &&
      String(result.stepResults[2]?.handoff?.fromAgentId),
    "agent-researcher",
    "critic handoff comes from researcher (last completed), not skipped synthesizer",
  );
  assertEqual(
    invoker.calls.find((call) => String(call.agentId) === "agent-critic")
      ?.input,
    researcherOut,
    "critic invoked with researcher's output, not synthesizer's",
  );
  assertTruthy(
    !invoker.calls.some((call) => String(call.agentId) === "agent-synthesizer"),
    "synthesizer never invoked when skipped",
  );
}

async function assertAllRolesSkippedIsPartialNotFailed(): Promise<void> {
  console.log(
    "[workflow] every planned role skipped still yields partial, not failed...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(
    sampleGoal({
      metadata: {
        [WORKFLOW_SKIP_ROLES_METADATA_KEY]: "researcher,synthesizer,critic",
      },
    }),
  );
  assertEqual(result.status, "partial", "partial, not failed, when nothing ran");
  assertEqual(result.stepResults.length, 3, "three step results");
  assertTruthy(
    result.stepResults.every((step) => step.status === "skipped"),
    "all steps skipped",
  );
  assertEqual(invoker.calls.length, 0, "invoker never called");
}

async function assertStepZeroSkippedFallsBackToObjective(): Promise<void> {
  console.log(
    "[workflow] skipping the first planned step: next step has no handoff, uses objective directly...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = buildOrchestrator(registry, invoker);

  const result = await orchestrator.run(
    sampleGoal({
      metadata: { [WORKFLOW_SKIP_ROLES_METADATA_KEY]: "researcher" },
    }),
  );
  assertEqual(result.status, "partial", "partial status");
  assertEqual(result.stepResults[0]?.status, "skipped", "researcher skipped");
  assertEqual(result.stepResults[1]?.handoff, undefined, "synthesizer has no handoff (no prior completed step)");
  assertEqual(invoker.calls.length, 2, "synthesizer + critic only");
  assertEqual(
    invoker.calls[0]?.input,
    "summarize the policy",
    "synthesizer invoked directly with objective, matching today's step-0 behavior",
  );
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
  await assertRetrySucceedsOnSecondAttempt();
  await assertSkipRoleProducesPartialStatus();
  await assertSkipInMiddleStillHandoffsFromLastCompleted();
  await assertAllRolesSkippedIsPartialNotFailed();
  await assertStepZeroSkippedFallsBackToObjective();
  await assertMissingAgentFails();
  await assertRoleMismatchFails();
  await assertEmptyGoalThrows();
  console.log("Default workflow orchestrator validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
