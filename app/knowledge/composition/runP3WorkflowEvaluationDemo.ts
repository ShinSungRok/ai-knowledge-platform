/**
 * P3 Workflow Evaluation demo — Fake invoker (portfolio).
 *
 * Runs RunWorkflowEvaluationUseCase and prints deterministic metrics
 * (no LLM-as-judge). Composition wires application + workflow ports.
 *
 *   pnpm demo:workflow:evaluation
 */
import { RunWorkflowEvaluationUseCase } from "../application/RunWorkflowEvaluationUseCase";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
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
import type { WorkflowEvaluationMetrics } from "../workflow/WorkflowEvaluationMetrics";

class DemoWorkflowAgent implements WorkflowAgent {
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
  return new DemoWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
}

function printMetrics(metrics: WorkflowEvaluationMetrics): void {
  console.log("\n--- metrics ---");
  console.log(`passRate:    ${metrics.passRate}`);
  console.log(`passedCount: ${metrics.passedCount}/${metrics.caseCount}`);
  for (const score of metrics.caseScores) {
    console.log(
      `\n[${score.caseId}] passed=${score.passed}  status=${score.actualStatus}`,
    );
    const reasons = score.failureReasons ?? [];
    if (reasons.length > 0) {
      console.log(`  failures: ${reasons.join("; ")}`);
    }
  }
}

async function main(): Promise<void> {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    new FakeWorkflowAgentInvoker(),
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("demo-eval-unused"),
  );
  const useCase = new RunWorkflowEvaluationUseCase(
    orchestrator,
    new DefaultWorkflowRunEvaluator(),
    memory,
  );

  const dataset: WorkflowEvaluationDataset = {
    id: "demo-wf-eval-fake",
    cases: [
      {
        id: "case-policy-summary",
        workspaceId: "workspace-a",
        objective: "Summarize last-quarter security policy changes.",
        expectStatus: "completed",
        expectMinCompletedSteps: 3,
        expectRequiredRoles: ["researcher", "synthesizer", "critic"],
        expectHandoff: true,
        expectMemoryKinds: ["objective", "step_output", "handoff"],
      },
    ],
  };

  console.log("=== P3 Workflow Evaluation Demo (Fake invoker) ===");
  console.log("Why: score multi-agent runs deterministically (no LLM-as-judge)");
  console.log(`Dataset: ${dataset.id}  cases=${dataset.cases.length}`);

  const metrics = await useCase.execute({ dataset });
  printMetrics(metrics);

  if (metrics.passRate !== 1) {
    console.error("\nDemo expected passRate=1");
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nDemo finished. Validators: pnpm validate:workflow:evaluation / validate:application:eval-workflow",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
