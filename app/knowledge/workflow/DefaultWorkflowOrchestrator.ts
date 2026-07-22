import { randomUUID } from "node:crypto";

import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowHandoff } from "./WorkflowHandoff";
import type { WorkflowHandoffBuilder } from "./WorkflowHandoffBuilder";
import type { WorkflowMemoryStore } from "./WorkflowMemoryStore";
import type { WorkflowOrchestrator } from "./WorkflowOrchestrator";
import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowPlanStep } from "./WorkflowPlanStep";
import type { WorkflowPlanner } from "./WorkflowPlanner";
import type { WorkflowRunResult } from "./WorkflowRunResult";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";
import { asWorkflowRunId, type WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * Default {@link WorkflowOrchestrator}: plan → resolve agent → invoke →
 * aggregate status, appending Shared Workflow Memory (write-only v1).
 *
 * Constructor injects planner / registry / invoker / handoffBuilder /
 * memory, plus optional `runIdFactory` (defaults to `randomUUID`).
 * Step 0 uses planned `step.input`. Steps after 0 use handoff payload.
 * Memory: objective at start; handoff before invoke (steps>0); step_output
 * after successful invoke only. Does not read memory into invoker input.
 */
export class DefaultWorkflowOrchestrator implements WorkflowOrchestrator {
  private readonly runIdFactory: () => WorkflowRunId;

  constructor(
    private readonly planner: WorkflowPlanner,
    private readonly registry: WorkflowAgentRegistry,
    private readonly invoker: WorkflowAgentInvoker,
    private readonly handoffBuilder: WorkflowHandoffBuilder,
    private readonly memory: WorkflowMemoryStore,
    runIdFactory?: () => WorkflowRunId,
  ) {
    this.runIdFactory =
      runIdFactory ?? (() => asWorkflowRunId(randomUUID()));
  }

  async run(goal: WorkflowGoal): Promise<WorkflowRunResult> {
    this.assertGoal(goal);
    const workflowRunId = this.resolveRunId(goal);
    const goalWithRun: WorkflowGoal = {
      ...goal,
      workflowRunId,
    };

    await this.memory.append({
      workspaceId: goal.workspaceId,
      workflowRunId,
      kind: "objective",
      content: goal.objective,
    });

    const plan = await this.planner.plan(goalWithRun);
    const stepResults = await this.executeSteps(plan, workflowRunId);
    const status = this.toStatus(stepResults);
    const summary =
      status === "completed"
        ? `Completed ${stepResults.length} workflow step(s)`
        : `Failed after ${stepResults.length} workflow step(s)`;

    return { plan, stepResults, status, workflowRunId, summary };
  }

  private resolveRunId(goal: WorkflowGoal): WorkflowRunId {
    if (goal.workflowRunId !== undefined) {
      return asWorkflowRunId(String(goal.workflowRunId));
    }
    return asWorkflowRunId(String(this.runIdFactory()));
  }

  private assertGoal(goal: WorkflowGoal): void {
    if (!goal || typeof goal !== "object") {
      throw new Error("WorkflowGoal must be an object");
    }
    if (
      typeof goal.workspaceId !== "string" ||
      goal.workspaceId.trim().length === 0
    ) {
      throw new Error("WorkflowGoal.workspaceId must be a non-empty string");
    }
    if (
      typeof goal.objective !== "string" ||
      goal.objective.trim().length === 0
    ) {
      throw new Error("WorkflowGoal.objective must be a non-empty string");
    }
  }

  private async executeSteps(
    plan: WorkflowPlan,
    workflowRunId: WorkflowRunId,
  ): Promise<WorkflowStepResult[]> {
    const stepResults: WorkflowStepResult[] = [];

    for (let index = 0; index < plan.steps.length; index += 1) {
      const step = plan.steps[index];
      if (!step) {
        continue;
      }
      const previous = index > 0 ? stepResults[index - 1] : undefined;
      const result = await this.executeStep(
        plan.goal,
        step,
        previous,
        workflowRunId,
      );
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
    previous: WorkflowStepResult | undefined,
    workflowRunId: WorkflowRunId,
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

    let invokeInput = step.input;
    let handoff: WorkflowHandoff | undefined;

    if (previous !== undefined) {
      try {
        handoff = this.handoffBuilder.build({
          goal,
          previous,
          next: step,
        });
        invokeInput = handoff.payload;
        await this.memory.append({
          workspaceId: goal.workspaceId,
          workflowRunId,
          kind: "handoff",
          content: handoff.payload,
          agentId: handoff.toAgentId,
          stepId: handoff.toStepId,
          handoffKind: handoff.kind,
        });
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

    try {
      const invoked = await this.invoker.invoke({
        workspaceId: goal.workspaceId,
        agentId: step.agentId,
        role: step.role,
        input: invokeInput,
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
          ...(handoff !== undefined ? { handoff } : {}),
        };
      }

      await this.memory.append({
        workspaceId: goal.workspaceId,
        workflowRunId,
        kind: "step_output",
        content: invoked.output,
        agentId: step.agentId,
        stepId: step.id,
      });

      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "completed",
        output: invoked.output,
        ...(handoff !== undefined ? { handoff } : {}),
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
        ...(handoff !== undefined ? { handoff } : {}),
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
