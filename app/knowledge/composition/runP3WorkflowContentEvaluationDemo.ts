/**
 * P3 Workflow Content Evaluation demo — LLM-as-judge, Fake invoker + Fake
 * language model (portfolio).
 *
 * Runs RunWorkflowContentEvaluationUseCase and prints content-judgment
 * metrics. Composition wires application + workflow ports.
 *
 *   pnpm demo:workflow:content-evaluation
 *
 * IMPORTANT: this demo uses the dependency-free Fake language model
 * adapter by default (no network, no API key), which echoes the prompt
 * back verbatim — it contains no parseable "score: N" line, so every
 * case below reports `unparseable-llm-response` / passed=false. That is
 * the correct, honest no-op behavior for the Fake path (same as
 * LlmRerankedSearch's documented Fake-path limitation), not a bug. The
 * real behavioral proof that LLM-as-judge scoring works is
 * `pnpm validate:workflow:content-evaluation`, which scripts a language
 * model double to actually emit "score: N" lines.
 */
import { RunWorkflowContentEvaluationUseCase } from "../application/RunWorkflowContentEvaluationUseCase";
import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import { LlmWorkflowRunContentEvaluator } from "../workflow/LlmWorkflowRunContentEvaluator";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import type { WorkflowContentEvaluationMetrics } from "../workflow/WorkflowContentEvaluationMetrics";
import type { WorkflowEvaluationDataset } from "../workflow/WorkflowEvaluationDataset";

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

function printMetrics(metrics: WorkflowContentEvaluationMetrics): void {
  console.log("\n--- content metrics ---");
  console.log(`passRate:    ${metrics.passRate}`);
  console.log(`passedCount: ${metrics.passedCount}/${metrics.caseCount}`);
  for (const score of metrics.caseScores) {
    console.log(
      `\n[${score.caseId}] passed=${score.passed}  score=${score.score ?? "n/a"}`,
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
    () => asWorkflowRunId("demo-content-eval-unused"),
  );
  const useCase = new RunWorkflowContentEvaluationUseCase(
    orchestrator,
    new LlmWorkflowRunContentEvaluator(new FakeLanguageModelProvider()),
    memory,
  );

  const dataset: WorkflowEvaluationDataset = {
    id: "demo-wf-content-eval-fake",
    cases: [
      {
        id: "case-policy-summary",
        workspaceId: "workspace-a",
        objective: "Summarize last-quarter security policy changes.",
        expectStatus: "completed",
      },
    ],
  };

  console.log("=== P3 Workflow Content Evaluation Demo (Fake LLM) ===");
  console.log(
    "Why: judge whether run output content actually satisfies the objective, not just structural shape",
  );
  console.log(`Dataset: ${dataset.id}  cases=${dataset.cases.length}`);

  const metrics = await useCase.execute({ dataset });
  printMetrics(metrics);

  console.log(
    "\nExpected against the Fake LLM: every case shows passed=false / " +
      "unparseable-llm-response — the Fake provider just echoes the prompt, " +
      "so there is no real judgment to report. This is the honest no-op " +
      "behavior, not a failure.",
  );
  console.log(
    "\nDemo finished. Real scoring behavior is proven by: " +
      "pnpm validate:workflow:content-evaluation / validate:application:eval-workflow-content",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
