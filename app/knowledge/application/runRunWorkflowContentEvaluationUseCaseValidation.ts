import { RunWorkflowContentEvaluationUseCase } from "./RunWorkflowContentEvaluationUseCase";
import type { GeneratedText } from "../ai/GeneratedText";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
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

/** Validation-only Fake LanguageModelProvider: returns a scripted response string. */
class ScriptedLanguageModelProvider implements LanguageModelProvider {
  constructor(private readonly response: string) {}
  async generate(_prompt: GroundedPrompt): Promise<GeneratedText> {
    return { text: this.response };
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
  memory: InMemoryWorkflowMemoryStore,
  llmResponse: string,
): RunWorkflowContentEvaluationUseCase {
  const registry = new InMemoryWorkflowAgentRegistry();
  registerCoreTrio(registry);
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    new FakeWorkflowAgentInvoker(),
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("should-be-overridden-by-goal"),
  );
  return new RunWorkflowContentEvaluationUseCase(
    orchestrator,
    new LlmWorkflowRunContentEvaluator(
      new ScriptedLanguageModelProvider(llmResponse),
    ),
    memory,
  );
}

async function assertSuccessfulDataset(): Promise<void> {
  console.log(
    "[application-eval-workflow-content] high-scored dataset passes...",
  );
  const memory = new InMemoryWorkflowMemoryStore();
  const useCase = buildUseCase(memory, "score: 9");
  const dataset: WorkflowEvaluationDataset = {
    id: "wf-content-eval-success",
    cases: [
      {
        id: "case-success",
        workspaceId: "workspace-a",
        objective: "summarize the policy",
        expectStatus: "completed",
      },
    ],
  };
  const metrics = await useCase.execute({ dataset });
  assertEqual(metrics.passRate, 1, "passRate 1");
  assertEqual(metrics.passedCount, 1, "passedCount");
  assertEqual(metrics.caseScores[0]?.passed, true, "case passed");
  assertEqual(metrics.caseScores[0]?.score, 0.9, "case score normalized");
}

async function assertLowScoredDatasetFails(): Promise<void> {
  console.log(
    "[application-eval-workflow-content] low-scored dataset fails with a labeled reason...",
  );
  const memory = new InMemoryWorkflowMemoryStore();
  const useCase = buildUseCase(memory, "score: 1");
  const dataset: WorkflowEvaluationDataset = {
    id: "wf-content-eval-fail",
    cases: [
      {
        id: "case-fail",
        workspaceId: "workspace-a",
        objective: "summarize the policy",
        expectStatus: "completed",
      },
    ],
  };
  const metrics = await useCase.execute({ dataset });
  assertEqual(metrics.passRate, 0, "passRate 0");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.includes("below-min-llm-judge-score"),
    "expected below-min-llm-judge-score failure reason",
  );
}

async function main(): Promise<void> {
  await assertSuccessfulDataset();
  await assertLowScoredDatasetFails();
  console.log("RunWorkflowContentEvaluationUseCase validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
