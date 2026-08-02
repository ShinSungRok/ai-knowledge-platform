import { randomUUID } from "node:crypto";

import { MAX_STEP_INVOKE_ATTEMPTS } from "./MAX_STEP_INVOKE_ATTEMPTS";
import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentInvoker } from "./WorkflowAgentInvoker";
import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
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
import { WORKFLOW_SKIP_ROLES_METADATA_KEY } from "./WORKFLOW_SKIP_ROLES_METADATA_KEY";

/**
 * Default {@link WorkflowOrchestrator}: plan → resolve agent → invoke →
 * aggregate status, appending Shared Workflow Memory (write-only v1).
 *
 * Constructor injects planner / registry / invoker / handoffBuilder /
 * memory, plus optional `runIdFactory` (defaults to `randomUUID`).
 * Step 0 uses planned `step.input`. Steps after 0 use handoff payload
 * built from the last **completed** step (skipped steps are looked
 * through). Memory: objective at start; handoff before invoke (when a
 * prior completed step exists); step_output after successful invoke only.
 * Does not read memory into invoker input.
 *
 * Conditional execution: a step whose role is named in
 * {@link WorkflowGoal.metadata}'s {@link WORKFLOW_SKIP_ROLES_METADATA_KEY}
 * is skipped (status `"skipped"`, no invoke, no handoff) without halting
 * the run. Bounded retry: invoke failures (throw or `ok:false`) are
 * retried up to {@link MAX_STEP_INVOKE_ATTEMPTS} times; structural
 * pre-invoke failures (unknown agent, role mismatch, handoff-build throw)
 * are never retried. Dynamic delegation: a step's invoke result may set
 * `delegateToAgentId` to steer the *next* planned step to a different
 * registered agent of the same role (falls back to the planner's pick
 * when unset, unregistered, or wrong-role).
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
    const summary = this.toSummary(status, stepResults);

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
    let lastCompleted: WorkflowStepResult | undefined;

    for (let index = 0; index < plan.steps.length; index += 1) {
      const step = plan.steps[index];
      if (!step) {
        continue;
      }
      const result = await this.executeStep(
        plan.goal,
        step,
        lastCompleted,
        workflowRunId,
      );
      stepResults.push(result);
      if (result.status === "completed") {
        lastCompleted = result;
      }
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
    if (this.isRoleSkipped(goal, step.role)) {
      return {
        stepId: step.id,
        agentId: step.agentId,
        role: step.role,
        status: "skipped",
        output: "",
      };
    }

    const effectiveAgentId = this.resolveEffectiveAgentId(step, previous);
    const effectiveStep: WorkflowPlanStep =
      effectiveAgentId === step.agentId
        ? step
        : { ...step, agentId: effectiveAgentId };

    const agent = this.registry.getById(effectiveStep.agentId);
    if (!agent) {
      return {
        stepId: effectiveStep.id,
        agentId: effectiveStep.agentId,
        role: effectiveStep.role,
        status: "failed",
        output: "",
        error: `Unknown workflow agent id: ${effectiveStep.agentId}`,
      };
    }

    if (agent.descriptor.role !== effectiveStep.role) {
      return {
        stepId: effectiveStep.id,
        agentId: effectiveStep.agentId,
        role: effectiveStep.role,
        status: "failed",
        output: "",
        error: `Workflow step role mismatch: step=${effectiveStep.role} agent=${agent.descriptor.role}`,
      };
    }

    let invokeInput = effectiveStep.input;
    let handoff: WorkflowHandoff | undefined;

    if (previous !== undefined) {
      try {
        handoff = this.handoffBuilder.build({
          goal,
          previous,
          next: effectiveStep,
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
          stepId: effectiveStep.id,
          agentId: effectiveStep.agentId,
          role: effectiveStep.role,
          status: "failed",
          output: "",
          error: message,
        };
      }
    }

    for (let attempt = 1; attempt <= MAX_STEP_INVOKE_ATTEMPTS; attempt += 1) {
      try {
        const invoked = await this.invoker.invoke({
          workspaceId: goal.workspaceId,
          agentId: effectiveStep.agentId,
          role: effectiveStep.role,
          input: invokeInput,
          stepId: effectiveStep.id,
        });

        if (!invoked.ok) {
          if (attempt < MAX_STEP_INVOKE_ATTEMPTS) {
            continue;
          }
          return {
            stepId: effectiveStep.id,
            agentId: effectiveStep.agentId,
            role: effectiveStep.role,
            status: "failed",
            output: invoked.output ?? "",
            error: invoked.error ?? "Workflow agent invoke failed",
            ...(handoff !== undefined ? { handoff } : {}),
            ...(attempt > 1 ? { attempts: attempt } : {}),
          };
        }

        // Skip empty/whitespace outputs so handoff can reject them on the
        // next step; do not fail the completed step on memory append.
        if (invoked.output.trim().length > 0) {
          await this.memory.append({
            workspaceId: goal.workspaceId,
            workflowRunId,
            kind: "step_output",
            content: invoked.output,
            agentId: effectiveStep.agentId,
            stepId: effectiveStep.id,
          });
        }

        return {
          stepId: effectiveStep.id,
          agentId: effectiveStep.agentId,
          role: effectiveStep.role,
          status: "completed",
          output: invoked.output,
          ...(handoff !== undefined ? { handoff } : {}),
          ...(attempt > 1 ? { attempts: attempt } : {}),
          ...(invoked.delegateToAgentId !== undefined
            ? { delegateToAgentId: invoked.delegateToAgentId }
            : {}),
        };
      } catch (error) {
        if (attempt < MAX_STEP_INVOKE_ATTEMPTS) {
          continue;
        }
        const message = error instanceof Error ? error.message : String(error);
        return {
          stepId: effectiveStep.id,
          agentId: effectiveStep.agentId,
          role: effectiveStep.role,
          status: "failed",
          output: "",
          error: message,
          ...(handoff !== undefined ? { handoff } : {}),
          ...(attempt > 1 ? { attempts: attempt } : {}),
        };
      }
    }

    throw new Error(
      "DefaultWorkflowOrchestrator: retry loop exhausted without returning",
    );
  }

  private isRoleSkipped(goal: WorkflowGoal, role: WorkflowAgentRole): boolean {
    const raw = goal.metadata?.[WORKFLOW_SKIP_ROLES_METADATA_KEY];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return false;
    }
    return raw
      .split(",")
      .map((token) => token.trim())
      .includes(role);
  }

  private resolveEffectiveAgentId(
    step: WorkflowPlanStep,
    previous: WorkflowStepResult | undefined,
  ): WorkflowAgentId {
    const requestedId = previous?.delegateToAgentId;
    if (requestedId === undefined) {
      return step.agentId;
    }
    const candidates = this.registry.listByRole(step.role);
    const isRegisteredCandidate = candidates.some(
      (candidate) => candidate.descriptor.id === requestedId,
    );
    return isRegisteredCandidate ? requestedId : step.agentId;
  }

  private toStatus(
    stepResults: readonly WorkflowStepResult[],
  ): WorkflowRunStatus {
    if (stepResults.length === 0) {
      return "failed";
    }
    if (stepResults.some((result) => result.status === "failed")) {
      return "failed";
    }
    if (stepResults.every((result) => result.status === "completed")) {
      return "completed";
    }
    return "partial";
  }

  private toSummary(
    status: WorkflowRunStatus,
    stepResults: readonly WorkflowStepResult[],
  ): string {
    if (status === "completed") {
      return `Completed ${stepResults.length} workflow step(s)`;
    }
    if (status === "partial") {
      const skippedCount = stepResults.filter(
        (result) => result.status === "skipped",
      ).length;
      return `Completed ${stepResults.length} workflow step(s) with ${skippedCount} skipped`;
    }
    return `Failed after ${stepResults.length} workflow step(s)`;
  }
}
