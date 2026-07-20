import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultAgentOrchestrator } from "./DefaultAgentOrchestrator";
import type { AgentPlanner } from "./AgentPlanner";
import type { AgentStepExecutor } from "./AgentStepExecutor";
import type { AgentReviewer } from "./AgentReviewer";
import type { AgentOrchestrator } from "./AgentOrchestrator";
import type { AgentGoal } from "./AgentGoal";
import type { AgentPlan } from "./AgentPlan";
import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentReviewResult } from "./AgentReviewResult";

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

class ConfigurablePlanner implements AgentPlanner {
  public planCalls = 0;
  public nextPlan: AgentPlan | null = null;

  async plan(goal: AgentGoal): Promise<AgentPlan> {
    this.planCalls += 1;
    if (this.nextPlan) {
      return this.nextPlan;
    }
    return {
      goal,
      steps: [
        {
          id: "step-1",
          toolName: "generate_cited_grounded_answer",
          arguments: {
            workspaceId: goal.workspaceId,
            query: goal.query,
            retrievalLimit: goal.retrievalLimit,
            maxCharacters: goal.maxCharacters,
          },
        },
      ],
    };
  }
}

class ConfigurableStepExecutor implements AgentStepExecutor {
  public executeCalls = 0;
  public executedStepIds: string[] = [];
  public nextResults: AgentStepResult[] = [];
  public throwOnStepId: string | null = null;
  public throwMessage = "forced step failure";

  async executeStep(
    step: AgentPlanStep,
    _timeoutMs: number,
  ): Promise<AgentStepResult> {
    this.executeCalls += 1;
    this.executedStepIds.push(step.id);
    if (this.throwOnStepId === step.id) {
      throw new Error(this.throwMessage);
    }
    const next = this.nextResults.shift();
    if (next) {
      return next;
    }
    return {
      stepId: step.id,
      toolCall: {
        ok: true,
        status: "success",
        toolName: step.toolName,
        result: { ok: true },
        durationMs: 5,
      },
    };
  }
}

class ConfigurableReviewer implements AgentReviewer {
  public reviewCalls = 0;
  public lastStepResults: readonly AgentStepResult[] | null = null;
  public nextReview: AgentReviewResult = {
    decision: "approved",
    reason: "All tool calls succeeded",
  };

  async review(
    _plan: AgentPlan,
    stepResults: readonly AgentStepResult[],
  ): Promise<AgentReviewResult> {
    this.reviewCalls += 1;
    this.lastStepResults = stepResults;
    return this.nextReview;
  }
}

function sampleGoal(overrides: Partial<AgentGoal> = {}): AgentGoal {
  return {
    workspaceId: "workspace-a",
    query: "what is the policy?",
    retrievalLimit: 5,
    maxCharacters: 1_000,
    toolTimeoutMs: 2_000,
    ...overrides,
  };
}

function buildOrchestrator(
  planner: AgentPlanner,
  stepExecutor: AgentStepExecutor,
  reviewer: AgentReviewer,
): AgentOrchestrator {
  return new DefaultAgentOrchestrator(planner, stepExecutor, reviewer);
}

function assertDependsOnlyOnRolePorts(): void {
  console.log("[agent] DefaultAgentOrchestrator depends only on planner/stepExecutor/reviewer ports...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/agent/DefaultAgentOrchestrator.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "./AgentPlanner"'),
    "Orchestrator must import AgentPlanner port",
  );
  assertTruthy(
    source.includes('from "./AgentStepExecutor"'),
    "Orchestrator must import AgentStepExecutor port",
  );
  assertTruthy(
    source.includes('from "./AgentReviewer"'),
    "Orchestrator must import AgentReviewer port",
  );

  const forbiddenReferences = [
    "DeterministicKnowledgeAgentPlanner",
    "DefaultAgentStepExecutor",
    "DefaultAgentReviewer",
    "DefaultToolExecutor",
    "LanguageModelProvider",
    "DefaultInMemoryRepository",
    "ExecuteToolCallUseCase",
    "RunAgentUseCase",
    "../application/",
    "../tools/",
    "../persistence/",
    "../ai/",
    "../mcp/",
    'from "../tools',
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultAgentOrchestrator.ts must not reference "${reference}"`,
    );
  }
}

async function assertApprovedCompletedPath(): Promise<void> {
  console.log("[agent] run maps approved review to status=completed...");
  const planner = new ConfigurablePlanner();
  const stepExecutor = new ConfigurableStepExecutor();
  const reviewer = new ConfigurableReviewer();
  reviewer.nextReview = {
    decision: "approved",
    reason: "All tool calls succeeded",
  };

  const result = await buildOrchestrator(planner, stepExecutor, reviewer).run(
    sampleGoal(),
  );

  assertEqual(planner.planCalls, 1, "expected one planner.plan call");
  assertEqual(stepExecutor.executeCalls, 1, "expected one step execution");
  assertEqual(reviewer.reviewCalls, 1, "expected one reviewer.review call");
  assertEqual(result.review.decision, "approved", "expected approved review");
  assertEqual(result.status, "completed", "expected completed status");
  assertEqual(result.stepResults.length, 1, "expected one step result");
  assertEqual(result.stepResults[0]?.toolCall.status, "success", "expected success tool call");
}

async function assertToolFailureFailedPath(): Promise<void> {
  console.log("[agent] run maps rejected review with a non-success tool call to status=failed...");
  const planner = new ConfigurablePlanner();
  const stepExecutor = new ConfigurableStepExecutor();
  stepExecutor.nextResults = [
    {
      stepId: "step-1",
      toolCall: {
        ok: false,
        status: "failure",
        toolName: "generate_cited_grounded_answer",
        error: "backend failed",
        durationMs: 3,
      },
    },
  ];
  const reviewer = new ConfigurableReviewer();
  reviewer.nextReview = {
    decision: "rejected",
    reason: "Tool call did not succeed: failure",
  };

  const result = await buildOrchestrator(planner, stepExecutor, reviewer).run(
    sampleGoal(),
  );

  assertEqual(result.review.decision, "rejected", "expected rejected review");
  assertEqual(result.status, "failed", "expected failed status");
  assertEqual(result.stepResults[0]?.toolCall.status, "failure", "expected failure tool call");
}

async function assertSuccessButRejectedPath(): Promise<void> {
  console.log("[agent] run maps rejected review with all-success tool calls to status=rejected (mismatch fake)...");
  const planner = new ConfigurablePlanner();
  planner.nextPlan = {
    goal: sampleGoal(),
    steps: [
      {
        id: "step-1",
        toolName: "generate_cited_grounded_answer",
        arguments: { workspaceId: "workspace-a", query: "q", retrievalLimit: 1, maxCharacters: 100 },
      },
      {
        id: "step-2",
        toolName: "generate_cited_grounded_answer",
        arguments: { workspaceId: "workspace-a", query: "q", retrievalLimit: 1, maxCharacters: 100 },
      },
    ],
  };
  const stepExecutor = new ConfigurableStepExecutor();
  // Only one success result is produced by stopping after first via throw —
  // for all-success + rejected we instead fake the reviewer mismatch while
  // still executing both steps successfully.
  const reviewer = new ConfigurableReviewer();
  reviewer.nextReview = {
    decision: "rejected",
    reason: "Step result count mismatch",
  };

  const result = await buildOrchestrator(planner, stepExecutor, reviewer).run(
    sampleGoal(),
  );

  assertEqual(stepExecutor.executeCalls, 2, "expected both steps executed");
  assertEqual(
    result.stepResults.every((s) => s.toolCall.status === "success"),
    true,
    "expected all tool calls successful",
  );
  assertEqual(result.review.decision, "rejected", "expected rejected review");
  assertEqual(result.review.reason, "Step result count mismatch", "expected mismatch reason");
  assertEqual(result.status, "rejected", "expected rejected status");
}

async function assertThrownStepStopsAndRecordsFailure(): Promise<void> {
  console.log("[agent] run catches step throws, records failure ToolCallResult, stops remaining steps, still reviews...");
  const planner = new ConfigurablePlanner();
  planner.nextPlan = {
    goal: sampleGoal(),
    steps: [
      { id: "step-1", toolName: "tool-a", arguments: {} },
      { id: "step-2", toolName: "tool-b", arguments: {} },
    ],
  };
  const stepExecutor = new ConfigurableStepExecutor();
  stepExecutor.throwOnStepId = "step-1";
  stepExecutor.throwMessage = "boom";
  const reviewer = new ConfigurableReviewer();
  reviewer.nextReview = {
    decision: "rejected",
    reason: "Tool call did not succeed: failure",
  };

  const result = await buildOrchestrator(planner, stepExecutor, reviewer).run(
    sampleGoal(),
  );

  assertEqual(stepExecutor.executeCalls, 1, "expected remaining steps not executed");
  assertEqual(stepExecutor.executedStepIds.join(","), "step-1", "expected only step-1 attempted");
  assertEqual(result.stepResults.length, 1, "expected one recorded step result");
  assertEqual(result.stepResults[0]?.toolCall.status, "failure", "expected failure status");
  assertEqual(result.stepResults[0]?.toolCall.error, "boom", "expected thrown message");
  assertEqual(result.stepResults[0]?.toolCall.durationMs, 0, "expected durationMs=0 for thrown step");
  assertEqual(reviewer.reviewCalls, 1, "expected reviewer still called");
  assertEqual(result.status, "failed", "expected failed status after throw");
}

async function main(): Promise<void> {
  assertDependsOnlyOnRolePorts();
  await assertApprovedCompletedPath();
  await assertToolFailureFailedPath();
  await assertSuccessButRejectedPath();
  await assertThrownStepStopsAndRecordsFailure();
  console.log("DefaultAgentOrchestrator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
