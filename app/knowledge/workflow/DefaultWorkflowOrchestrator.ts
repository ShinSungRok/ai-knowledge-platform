import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowOrchestrator } from "./WorkflowOrchestrator";
import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowPlanStep } from "./WorkflowPlanStep";
import type { WorkflowPlanner } from "./WorkflowPlanner";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * Default {@link WorkflowOrchestrator}: plan → resolve agent → invoke →
 * aggregate status. Mirrors Project 2 {@link DefaultAgentOrchestrator}
 * stop-on-failure (no skipped step entries).
 *
 * Constructor injects only planner / registry / invoker ports.
 * v1 status: any failed step → `"failed"` (no `"partial"` yet).
 * Explicit Handoff and Shared Workflow Memory remain deferred.
 */
export class DefaultWorkflowOrchestrator implements WorkflowOrchestrator {
  constructor(
    private readonly planner: WorkflowPlanner,
    private readonly registry: WorkflowAgentRegistry,
    private readonly invoker: WorkflowAgentInvoker,
  ) {}

  async run(goal: WorkflowGoal): Promise<WorkflowRunResult> {
    const plan = await this.planner.plan(goal);
    const stepResults = await this.executeSteps(plan);
    const status = this.toStatus(stepResults);
    const summary =
      status === "completed"
        ? `Completed ${stepResults.length} workflow step(s)`
        : `Failed after ${stepResults.length} workflow step(s)`;

    return { plan, stepResults, status, summary };
  }

  private async executeSteps(
    plan: WorkflowPlan,
  ): Promise<WorkflowStepResult[]> {
    const stepResults: WorkflowStepResult[] = [];

    for (const step of plan.steps) {
      const result = await this.executeStep(plan.goal, step);
      stepResults.push(result);
      if (result.status === "failed") {
        break;
      }
    }

    return stepResults;
  }

  private async executeStep(
    goal: WorkflowGoal,
    step: WorkflowPlanStep,
  ): Promise<WorkflowStepResult> {
    const agent = this.registry.getById(step.agentId);
    if (!agent) {
      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "failed",
        output: "",
        error: `Unknown workflow agent id: ${step.agentId}`,
      };
    }

    if (agent.descriptor.role !== step.role) {
      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "failed",
        output: "",
        error: `Workflow step role mismatch: step=${step.role} agent=${agent.descriptor.role}`,
      };
    }

    try {
      const invoked = await this.invoker.invoke({
        workspaceId: goal.workspaceId,
        agentId: step.agentId,
        role: step.role,
        input: step.input,
        stepId: step.id,
      });

      if (!invoked.ok) {
        return {
          stepId: step.id,
          agentId: step.agentId,
          role: step.role,
          status: "failed",
          output: invoked.output ?? "",
          error: invoked.error ?? "Workflow agent invoke failed",
        };
      }

      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "completed",
        output: invoked.output,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "failed",
        output: "",
        error: message,
      };
    }
  }

  private toStatus(
    stepResults: readonly WorkflowStepResult[],
  ): WorkflowRunStatus {
    if (
      stepResults.length > 0 &&
      stepResults.every((result) => result.status === "completed")
    ) {
      return "completed";
    }
    // v1: any failure → failed (partial reserved for a later Sprint).
    return "failed";
  }
}
