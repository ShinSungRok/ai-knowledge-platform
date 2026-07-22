import { RunWorkflowEvaluationUseCase } from "./RunWorkflowEvaluationUseCase";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DefaultWorkflowRunEvaluator } from "../workflow/DefaultWorkflowRunEvaluator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import type { WorkflowEvaluationDataset } from "../workflow/WorkflowEvaluationDataset";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";

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

function registerCoreTrio(registry: InMemoryWorkflowAgentRegistry): void {
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));
}

function buildUseCase(
  invoker: FakeWorkflowAgentInvoker,
  memory: InMemoryWorkflowMemoryStore,
): RunWorkflowEvaluationUseCase {
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("should-be-overridden-by-goal"),
  );
  return new RunWorkflowEvaluationUseCase(
    orchestrator,
    new DefaultWorkflowRunEvaluator(),
    memory,
  );
}

async function assertSuccessfulDataset(): Promise<void> {
  console.log(
    "[application-eval-workflow] successful completed+handoff+memory dataset...",
  );
  const memory = new InMemoryWorkflowMemoryStore();
  const useCase = buildUseCase(new FakeWorkflowAgentInvoker(), memory);
  const dataset: WorkflowEvaluationDataset = {
    id: "wf-eval-success",
    cases: [
      {
        id: "case-success",
        workspaceId: "workspace-a",
        objective: "summarize the policy",
        expectStatus: "completed",
        expectMinCompletedSteps: 3,
        expectRequiredRoles: ["researcher", "synthesizer", "critic"],
        expectHandoff: true,
        expectMemoryKinds: ["objective", "step_output", "handoff"],
      },
    ],
  };
  const metrics = await useCase.execute({ dataset });
  assertEqual(metrics.passRate, 1, "passRate 1");
  assertEqual(metrics.passedCount, 1, "passedCount");
  assertEqual(metrics.caseScores[0]?.passed, true, "case passed");
  assertEqual(
    String(
      (
        await memory.listByRun(
          "workspace-a",
          asWorkflowRunId("case-success"),
        )
      )[0]?.workflowRunId,
    ),
    "case-success",
    "memory scoped by case id",
  );
}

async function assertFailedStatusExpectation(): Promise<void> {
  console.log(
    "[application-eval-workflow] expected failed status with invoker failure...",
  );
  const memory = new InMemoryWorkflowMemoryStore();
  const invoker = new FakeWorkflowAgentInvoker({
    failingAgentIds: new Set(["agent-synthesizer"]),
  });
  const useCase = buildUseCase(invoker, memory);
  const dataset: WorkflowEvaluationDataset = {
    id: "wf-eval-failed",
    cases: [
      {
        id: "case-failed",
        workspaceId: "workspace-a",
        objective: "summarize the policy",
        expectStatus: "failed",
        expectMinCompletedSteps: 1,
        expectMemoryKinds: ["objective", "step_output", "handoff"],
      },
    ],
  };
  const metrics = await useCase.execute({ dataset });
  assertEqual(metrics.passRate, 1, "failed expectation passes");
  assertEqual(metrics.caseScores[0]?.actualStatus, "failed", "actual failed");
  assertEqual(metrics.caseScores[0]?.passed, true, "case passed");
}

async function main(): Promise<void> {
  await assertSuccessfulDataset();
  await assertFailedStatusExpectation();
  console.log("RunWorkflowEvaluationUseCase validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
