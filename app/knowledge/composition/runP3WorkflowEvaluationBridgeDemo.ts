/**
 * P3 Workflow Evaluation demo — P2 knowledge bridge (portfolio).
 *
 * Researcher uses InMemory cited-answer; then RunWorkflowEvaluationUseCase
 * scores the run (no LLM-as-judge).
 *
 *   pnpm demo:workflow:evaluation-bridge
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
import { KnowledgeAnswerWorkflowAgentInvoker } from "../workflow/KnowledgeAnswerWorkflowAgentInvoker";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import type { WorkflowEvaluationDataset } from "../workflow/WorkflowEvaluationDataset";
import type { WorkflowEvaluationMetrics } from "../workflow/WorkflowEvaluationMetrics";
import type { WorkflowKnowledgeAnswerPort } from "../workflow/WorkflowKnowledgeAnswerPort";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import { DEMO_QUERY, seedDemoKnowledge } from "./seedDemoKnowledge";

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
  const workspaceId = "workspace-a";
  const composition = createInMemoryKnowledgeComposition();
  await seedDemoKnowledge(composition, workspaceId);

  const knowledge: WorkflowKnowledgeAnswerPort = {
    async answer(input) {
      const cited = await composition.runtime.generateCitedGroundedAnswer({
        workspaceId: input.workspaceId,
        query: input.query,
      });
      return {
        answerText: cited.answer.text,
        citationCount: cited.citations.length,
        insufficientEvidence: cited.answer.insufficientEvidence,
      };
    },
  };

  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const memory = new InMemoryWorkflowMemoryStore();
  const invoker = new KnowledgeAnswerWorkflowAgentInvoker(
    knowledge,
    new FakeWorkflowAgentInvoker(),
  );
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("demo-eval-bridge-unused"),
  );
  const useCase = new RunWorkflowEvaluationUseCase(
    orchestrator,
    new DefaultWorkflowRunEvaluator(),
    memory,
  );

  const dataset: WorkflowEvaluationDataset = {
    id: "demo-wf-eval-bridge",
    cases: [
      {
        id: "case-demo-query",
        workspaceId,
        objective: DEMO_QUERY,
        expectStatus: "completed",
        expectMinCompletedSteps: 3,
        expectRequiredRoles: ["researcher", "synthesizer", "critic"],
        expectHandoff: true,
        expectMemoryKinds: ["objective", "step_output", "handoff"],
      },
    ],
  };

  console.log("=== P3 Workflow Evaluation × P2 Bridge Demo ===");
  console.log(
    "Why: evaluate a multi-agent run whose researcher reused P2 cited-answer",
  );
  console.log(`Dataset: ${dataset.id}  objective=${DEMO_QUERY}`);

  const metrics = await useCase.execute({ dataset });
  printMetrics(metrics);

  if (metrics.passRate !== 1) {
    console.error("\nDemo expected passRate=1");
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nDemo finished. Validators: pnpm validate:workflow:p2-bridge / validate:application:eval-workflow",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
