import { KNOWLEDGE_MODULE_AGENT } from "./index";
import type { AgentPlanner } from "./AgentPlanner";
import type { AgentStepExecutor } from "./AgentStepExecutor";
import type { AgentReviewer } from "./AgentReviewer";
import type { AgentOrchestrator } from "./AgentOrchestrator";
import type { AgentGoal } from "./AgentGoal";
import type { AgentPlan } from "./AgentPlan";
import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentReviewResult } from "./AgentReviewResult";
import type { AgentRunResult } from "./AgentRunResult";
import type {
  AgentPlanner as TopLevelAgentPlanner,
  AgentStepExecutor as TopLevelAgentStepExecutor,
  AgentReviewer as TopLevelAgentReviewer,
  AgentOrchestrator as TopLevelAgentOrchestrator,
} from "../index";

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

const SAMPLE_GOAL: AgentGoal = {
  workspaceId: "workspace-a",
  query: "what is the policy?",
  retrievalLimit: 5,
  maxCharacters: 1_000,
  toolTimeoutMs: 2_000,
};

class FakeAgentPlanner implements AgentPlanner {
  async plan(goal: AgentGoal): Promise<AgentPlan> {
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

class FakeAgentStepExecutor implements AgentStepExecutor {
  async executeStep(step: AgentPlanStep, timeoutMs: number): Promise<AgentStepResult> {
    return {
      stepId: step.id,
      toolCall: {
        ok: true,
        status: "success",
        toolName: step.toolName,
        result: { timeoutMs },
        durationMs: 0,
      },
    };
  }
}

class FakeAgentReviewer implements AgentReviewer {
  async review(
    _plan: AgentPlan,
    stepResults: readonly AgentStepResult[],
  ): Promise<AgentReviewResult> {
    const allSuccess = stepResults.every((s) => s.toolCall.status === "success");
    return allSuccess
      ? { decision: "approved", reason: "All tool calls succeeded" }
      : { decision: "rejected", reason: "Tool call did not succeed" };
  }
}

class FakeAgentOrchestrator implements AgentOrchestrator {
  async run(goal: AgentGoal): Promise<AgentRunResult> {
    const planner = new FakeAgentPlanner();
    const executor = new FakeAgentStepExecutor();
    const reviewer = new FakeAgentReviewer();
    const plan = await planner.plan(goal);
    const stepResults: AgentStepResult[] = [];
    for (const step of plan.steps) {
      stepResults.push(await executor.executeStep(step, goal.toolTimeoutMs));
    }
    const review = await reviewer.review(plan, stepResults);
    return {
      plan,
      stepResults,
      review,
      status: review.decision === "approved" ? "completed" : "failed",
    };
  }
}

function assertModuleConstant(): void {
  console.log("[agent] KNOWLEDGE_MODULE_AGENT constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_AGENT,
    "app/knowledge/agent",
    "unexpected KNOWLEDGE_MODULE_AGENT value",
  );
}

async function assertPortsAreImplementable(): Promise<void> {
  console.log("[agent] port contracts (Planner/StepExecutor/Reviewer/Orchestrator) are implementable and callable...");
  const planner: AgentPlanner = new FakeAgentPlanner();
  const stepExecutor: AgentStepExecutor = new FakeAgentStepExecutor();
  const reviewer: AgentReviewer = new FakeAgentReviewer();
  const orchestrator: AgentOrchestrator = new FakeAgentOrchestrator();

  const plan = await planner.plan(SAMPLE_GOAL);
  assertEqual(plan.steps.length, 1, "expected FakeAgentPlanner to return one step");
  assertEqual(plan.steps[0]?.toolName, "generate_cited_grounded_answer", "expected cited-answer tool name");

  const stepResult = await stepExecutor.executeStep(plan.steps[0]!, SAMPLE_GOAL.toolTimeoutMs);
  assertEqual(stepResult.stepId, "step-1", "expected stepId to echo the step id");
  assertEqual(stepResult.toolCall.status, "success", "expected FakeAgentStepExecutor success status");

  const review = await reviewer.review(plan, [stepResult]);
  assertEqual(review.decision, "approved", "expected FakeAgentReviewer to approve success steps");

  const run = await orchestrator.run(SAMPLE_GOAL);
  assertEqual(run.status, "completed", "expected FakeAgentOrchestrator completed status");
  assertEqual(run.review.decision, "approved", "expected approved review on orchestrator run");
  assertEqual(run.stepResults.length, 1, "expected one step result");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[agent] top-level app/knowledge barrel re-exports the agent port contract types...");
  const planner: AgentPlanner | null = null as TopLevelAgentPlanner | null;
  const stepExecutor: AgentStepExecutor | null = null as TopLevelAgentStepExecutor | null;
  const reviewer: AgentReviewer | null = null as TopLevelAgentReviewer | null;
  const orchestrator: AgentOrchestrator | null = null as TopLevelAgentOrchestrator | null;
  assertTruthy(planner === null, "expected AgentPlanner types to be assignable");
  assertTruthy(stepExecutor === null, "expected AgentStepExecutor types to be assignable");
  assertTruthy(reviewer === null, "expected AgentReviewer types to be assignable");
  assertTruthy(orchestrator === null, "expected AgentOrchestrator types to be assignable");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertPortsAreImplementable();
  assertTopLevelBarrelExportsContractTypes();
  console.log("Agent contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
