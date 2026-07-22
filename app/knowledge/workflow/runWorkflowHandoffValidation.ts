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
import type { WorkflowHandoffBuilder } from "./WorkflowHandoffBuilder";
import type { WorkflowStepResult } from "./WorkflowStepResult";

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

async function assertMultiStepHandoffChain(): Promise<void> {
  console.log(
    "[workflow-handoff] multi-step success: objective then previous outputs...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-fixed-handoff"),
  );

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "completed", "completed");
  assertEqual(result.stepResults.length, 3, "3 steps");

  const objective = "summarize the policy";
  const out0 = `echo:researcher:${objective}`;
  const out1 = `echo:synthesizer:${out0}`;

  assertEqual(invoker.calls[0]?.input, objective, "step0 objective");
  assertEqual(invoker.calls[1]?.input, out0, "step1 previous output");
  assertEqual(invoker.calls[2]?.input, out1, "step2 previous output");

  assertEqual(result.stepResults[0]?.handoff, undefined, "no handoff on step0");
  const handoff1 = result.stepResults[1]?.handoff;
  const handoff2 = result.stepResults[2]?.handoff;
  assertTruthy(handoff1 !== undefined, "step1 has handoff");
  assertTruthy(handoff2 !== undefined, "step2 has handoff");
  assertEqual(handoff1?.kind, "sequential", "step1 sequential");
  assertEqual(handoff2?.kind, "sequential", "step2 sequential");
  assertEqual(
    String(handoff1?.fromAgentId),
    "agent-researcher",
    "step1 from",
  );
  assertEqual(
    String(handoff1?.toAgentId),
    "agent-synthesizer",
    "step1 to",
  );
  assertTruthy(
    String(handoff1?.fromAgentId) !== String(handoff1?.toAgentId),
    "distinct agents",
  );
  assertEqual(handoff1?.payload, out0, "step1 payload");
  assertEqual(handoff1?.reason, "sequential-pass", "sequential reason");
}

async function assertEmptyPreviousOutputFails(): Promise<void> {
  console.log(
    "[workflow-handoff] empty previous output fails handoff build...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));

  const invoker = new FakeWorkflowAgentInvoker({
    handlers: new Map([
      [
        "agent-researcher",
        async () => ({ ok: true, output: "   " }),
      ],
    ]),
  });
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-fixed-handoff"),
  );

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "failed", "run failed");
  assertEqual(result.stepResults.length, 2, "failed on second step");
  assertEqual(result.stepResults[0]?.status, "completed", "first ok");
  assertEqual(result.stepResults[1]?.status, "failed", "second failed");
  assertTruthy(
    result.stepResults[1]?.error?.includes("Handoff payload must be non-empty"),
    "empty payload error",
  );
  assertEqual(invoker.calls.length, 1, "second step never invoked");
}

async function assertCoordinatorDelegationKind(): Promise<void> {
  console.log(
    "[workflow-handoff] coordinator→researcher yields delegation kind...",
  );
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-coord", "coordinator", "Coordinator"));
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const invoker = new FakeWorkflowAgentInvoker();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-fixed-handoff"),
  );

  const result = await orchestrator.run(sampleGoal());
  assertEqual(result.status, "completed", "completed with coordinator");
  assertEqual(result.stepResults[0]?.role, "coordinator", "first coordinator");
  assertEqual(result.stepResults[1]?.role, "researcher", "second researcher");
  assertEqual(
    result.stepResults[1]?.handoff?.kind,
    "delegation",
    "coordinator→researcher is delegation",
  );
  assertEqual(
    result.stepResults[1]?.handoff?.reason,
    "coordinator-delegation",
    "delegation reason",
  );
  assertEqual(
    result.stepResults[2]?.handoff?.kind,
    "sequential",
    "researcher→synthesizer sequential",
  );
}

async function assertBuilderDirectInvariants(): Promise<void> {
  console.log("[workflow-handoff] builder rejects same-agent handoff...");
  const builder: WorkflowHandoffBuilder = new DefaultWorkflowHandoffBuilder();
  const previous: WorkflowStepResult = {
    stepId: "step-1",
    agentId: asWorkflowAgentId("same-agent"),
    role: "researcher",
    status: "completed",
    output: "payload",
  };
  const next = {
    id: "step-2",
    agentId: asWorkflowAgentId("same-agent"),
    role: "synthesizer" as const,
    input: "ignored",
  };
  try {
    builder.build({ goal: sampleGoal(), previous, next });
    throw new Error("expected same-agent throw");
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes("Handoff requires distinct agents"),
      `unexpected: ${text}`,
    );
  }
}

async function main(): Promise<void> {
  await assertMultiStepHandoffChain();
  await assertEmptyPreviousOutputFails();
  await assertCoordinatorDelegationKind();
  await assertBuilderDirectInvariants();
  console.log("Workflow handoff validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
