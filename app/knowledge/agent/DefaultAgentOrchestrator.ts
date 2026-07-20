import type { AgentGoal } from "./AgentGoal";
import type { AgentPlan } from "./AgentPlan";
import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepResult } from "./AgentStepResult";
import type { AgentRunResult } from "./AgentRunResult";
import type { AgentExecutionStatus } from "./AgentExecutionStatus";
import type { AgentPlanner } from "./AgentPlanner";
import type { AgentStepExecutor } from "./AgentStepExecutor";
import type { AgentReviewer } from "./AgentReviewer";
import type { AgentOrchestrator } from "./AgentOrchestrator";

/**
 * Default {@link AgentOrchestrator}: runs planner → step executor →
 * reviewer in order, deriving {@link AgentExecutionStatus} from the
 * review decision and tool-call statuses.
 *
 * Constructor injects only the three role ports — never a concrete
 * adapter, tool-calling executor, LLM, repository, or application use
 * case. When a step throws, records a structured failure tool-call
 * result (`durationMs: 0`), stops remaining steps, and still invokes
 * the reviewer.
 */
export class DefaultAgentOrchestrator implements AgentOrchestrator {
  constructor(
    private readonly planner: AgentPlanner,
    private readonly stepExecutor: AgentStepExecutor,
    private readonly reviewer: AgentReviewer,
  ) {}

  async run(goal: AgentGoal): Promise<AgentRunResult> {
    const plan = await this.planner.plan(goal);
    const stepResults = await this.executeSteps(plan, goal.toolTimeoutMs);
    const review = await this.reviewer.review(plan, stepResults);
    const status = this.toStatus(review.decision, stepResults);

    return { plan, stepResults, review, status };
  }

  private async executeSteps(
    plan: AgentPlan,
    toolTimeoutMs: number,
  ): Promise<AgentStepResult[]> {
    const stepResults: AgentStepResult[] = [];

    for (const step of plan.steps) {
      try {
        const result = await this.stepExecutor.executeStep(step, toolTimeoutMs);
        stepResults.push(result);
      } catch (error) {
        stepResults.push(this.toThrownStepResult(step, error));
        break;
      }
    }

    return stepResults;
  }

  private toThrownStepResult(
    step: AgentPlanStep,
    error: unknown,
  ): AgentStepResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      stepId: step.id,
      toolCall: {
        ok: false,
        status: "failure",
        toolName: step.toolName,
        error: message,
        durationMs: 0,
      },
    };
  }

  private toStatus(
    decision: "approved" | "rejected",
    stepResults: readonly AgentStepResult[],
  ): AgentExecutionStatus {
    if (decision === "approved") {
      return "completed";
    }

    const allSucceeded = stepResults.every(
      (stepResult) => stepResult.toolCall.status === "success",
    );
    return allSucceeded ? "rejected" : "failed";
  }
}
