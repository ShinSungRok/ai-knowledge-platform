import { readFileSync } from "node:fs";
import path from "node:path";

import type { GeneratedText } from "../ai/GeneratedText";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import { LlmWorkflowRunContentEvaluator } from "./LlmWorkflowRunContentEvaluator";
import { asWorkflowAgentId } from "./WorkflowAgentId";
import { asWorkflowRunId } from "./WorkflowRunId";
import type { WorkflowEvaluationDataset } from "./WorkflowEvaluationDataset";
import type { WorkflowRunResult } from "./WorkflowRunResult";

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

/** Validation-only Fake LanguageModelProvider: returns a scripted response string, records call count. */
class ScriptedLanguageModelProvider implements LanguageModelProvider {
  public callCount = 0;

  constructor(private readonly response: string) {}

  async generate(_prompt: GroundedPrompt): Promise<GeneratedText> {
    this.callCount += 1;
    return { text: this.response };
  }
}

/** Echoes the prompt back verbatim, matching FakeLanguageModelProvider's real behavior. */
class EchoingLanguageModelProvider implements LanguageModelProvider {
  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    return { text: prompt.userMessage };
  }
}

function run(overrides: Partial<WorkflowRunResult> = {}): WorkflowRunResult {
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

function dataset(caseId: string, objective: string): WorkflowEvaluationDataset {
  return {
    id: "content-eval-dataset",
    cases: [
      {
        id: caseId,
        workspaceId: WORKSPACE_A,
        objective,
        expectStatus: "completed",
      },
    ],
  };
}

async function assertPortContract(): Promise<void> {
  console.log("[workflow] port contract (WorkflowRunContentEvaluator)...");
  const evaluator = new LlmWorkflowRunContentEvaluator(
    new EchoingLanguageModelProvider(),
  );
  assertTruthy(typeof evaluator.evaluate === "function", "evaluate must be defined");
}

async function assertMissingRunFailsWithoutCallingLlm(): Promise<void> {
  console.log("[workflow] evaluate marks a missing run as failed without calling the LLM...");
  const llm = new ScriptedLanguageModelProvider("score: 9");
  const evaluator = new LlmWorkflowRunContentEvaluator(llm);
  const metrics = await evaluator.evaluate({
    dataset: dataset("case-missing", "do something"),
    runsByCaseId: new Map(),
  });
  assertEqual(metrics.caseScores[0]?.passed, false, "missing run fails");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.includes("missing-run"),
    "expected missing-run failure reason",
  );
  assertEqual(llm.callCount, 0, "expected the LLM never called for a missing run");
}

async function assertHighScorePasses(): Promise<void> {
  console.log("[workflow] evaluate passes a case the LLM scores highly...");
  const llm = new ScriptedLanguageModelProvider("score: 9");
  const evaluator = new LlmWorkflowRunContentEvaluator(llm);
  const runsByCaseId = new Map([["case-a", run()]]);
  const metrics = await evaluator.evaluate({
    dataset: dataset("case-a", "find the relevant policy"),
    runsByCaseId,
  });
  assertEqual(metrics.caseScores[0]?.passed, true, "high score passes");
  assertEqual(metrics.caseScores[0]?.score, 0.9, "score normalized to 0.9");
  assertEqual(metrics.passRate, 1, "passRate 1");
}

async function assertLowScoreFails(): Promise<void> {
  console.log("[workflow] evaluate fails a case the LLM scores low, with a labeled reason...");
  const llm = new ScriptedLanguageModelProvider("score: 2");
  const evaluator = new LlmWorkflowRunContentEvaluator(llm);
  const runsByCaseId = new Map([["case-a", run()]]);
  const metrics = await evaluator.evaluate({
    dataset: dataset("case-a", "find the relevant policy"),
    runsByCaseId,
  });
  assertEqual(metrics.caseScores[0]?.passed, false, "low score fails");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.includes("below-min-llm-judge-score"),
    "expected below-min-llm-judge-score failure reason",
  );
}

async function assertEchoingProviderIsUnparseable(): Promise<void> {
  console.log("[workflow] evaluate reports unparseable-llm-response against an echoing Fake provider...");
  const evaluator = new LlmWorkflowRunContentEvaluator(
    new EchoingLanguageModelProvider(),
  );
  const runsByCaseId = new Map([["case-a", run()]]);
  const metrics = await evaluator.evaluate({
    dataset: dataset("case-a", "find the relevant policy"),
    runsByCaseId,
  });
  assertEqual(metrics.caseScores[0]?.passed, false, "echoed prompt is unparseable");
  assertTruthy(
    metrics.caseScores[0]?.failureReasons?.includes("unparseable-llm-response"),
    "expected unparseable-llm-response failure reason",
  );
  assertEqual(metrics.caseScores[0]?.score, undefined, "no score claimed");
}

async function assertClampsOutOfRangeScore(): Promise<void> {
  console.log("[workflow] evaluate clamps an out-of-range LLM score into 0..10 before normalizing...");
  const llm = new ScriptedLanguageModelProvider("score: 55");
  const evaluator = new LlmWorkflowRunContentEvaluator(llm);
  const runsByCaseId = new Map([["case-a", run()]]);
  const metrics = await evaluator.evaluate({
    dataset: dataset("case-a", "find the relevant policy"),
    runsByCaseId,
  });
  assertEqual(metrics.caseScores[0]?.score, 1, "expected an over-range score to clamp to 10/10=1");
}

async function assertOneLlmCallPerCase(): Promise<void> {
  console.log("[workflow] evaluate makes exactly one LLM call per case...");
  const llm = new ScriptedLanguageModelProvider("score: 7");
  const evaluator = new LlmWorkflowRunContentEvaluator(llm);
  const runsByCaseId = new Map([
    ["case-a", run({ workflowRunId: asWorkflowRunId("run-a") })],
    ["case-b", run({ workflowRunId: asWorkflowRunId("run-b") })],
  ]);
  const twoCaseDataset: WorkflowEvaluationDataset = {
    id: "content-eval-dataset-2",
    cases: [
      { id: "case-a", workspaceId: WORKSPACE_A, objective: "a", expectStatus: "completed" },
      { id: "case-b", workspaceId: WORKSPACE_A, objective: "b", expectStatus: "completed" },
    ],
  };
  await evaluator.evaluate({ dataset: twoCaseDataset, runsByCaseId });
  assertEqual(llm.callCount, 2, "expected one LLM call per case (2 cases)");
}

function assertLlmWorkflowRunContentEvaluatorImportsOnlyPorts(): void {
  console.log("[workflow] LlmWorkflowRunContentEvaluator imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/workflow/LlmWorkflowRunContentEvaluator.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../ai/LanguageModelProvider"'),
    "must import the LanguageModelProvider port",
  );
  const forbiddenReferences = [
    "FakeLanguageModelProvider",
    "HttpLanguageModelProvider",
    "DefaultWorkflowOrchestrator",
    "FakeWorkflowAgentInvoker",
    "InMemoryWorkflowMemoryStore",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `LlmWorkflowRunContentEvaluator.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertMissingRunFailsWithoutCallingLlm();
  await assertHighScorePasses();
  await assertLowScoreFails();
  await assertEchoingProviderIsUnparseable();
  await assertClampsOutOfRangeScore();
  await assertOneLlmCallPerCase();
  assertLlmWorkflowRunContentEvaluatorImportsOnlyPorts();
  console.log("LlmWorkflowRunContentEvaluator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
