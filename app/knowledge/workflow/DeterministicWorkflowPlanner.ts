import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowPlanStep } from "./WorkflowPlanStep";
import type { WorkflowPlanner } from "./WorkflowPlanner";

/**
 * Fixed planning priority (first matching registered agent per role):
 * 1. coordinator (optional)
 * 2. researcher
 * 3. synthesizer
 * 4. critic
 * 5. executor (optional)
 *
 * At least one of researcher / synthesizer / critic must be registered.
 * Every step receives `goal.objective` as `input` (no implied Handoff).
 */
const PLAN_ROLE_PRIORITY: readonly WorkflowAgentRole[] = [
  "coordinator",
  "researcher",
  "synthesizer",
  "critic",
  "executor",
] as const;

const REQUIRED_CORE_ROLES: readonly WorkflowAgentRole[] = [
  "researcher",
  "synthesizer",
  "critic",
] as const;

/**
 * Deterministic {@link WorkflowPlanner}: builds an ordered step list from
 * the first registered agent for each role in {@link PLAN_ROLE_PRIORITY}.
 *
 * Injects only {@link WorkflowAgentRegistry}. Does not invoke agents or
 * invent Handoff payloads — every step `input` is `goal.objective`.
 */
export class DeterministicWorkflowPlanner implements WorkflowPlanner {
  constructor(private readonly registry: WorkflowAgentRegistry) {}

  async plan(goal: WorkflowGoal): Promise<WorkflowPlan> {
    this.assertGoal(goal);

    const steps: WorkflowPlanStep[] = [];
    let stepIndex = 0;

    for (const role of PLAN_ROLE_PRIORITY) {
      const agents = this.registry.listByRole(role);
      const agent = agents[0];
      if (!agent) {
        continue;
      }
      stepIndex += 1;
      steps.push({
        id: `step-${stepIndex}`,
        agentId: agent.descriptor.id,
        role: agent.descriptor.role,
        input: goal.objective,
      });
    }

    const hasCoreRole = steps.some((step) =>
      (REQUIRED_CORE_ROLES as readonly string[]).includes(step.role),
    );
    if (!hasCoreRole) {
      throw new Error(
        "Workflow plan requires at least one of: researcher, synthesizer, critic",
      );
    }

    return {
      goal: this.cloneGoal(goal),
      steps,
    };
  }

  private assertGoal(goal: WorkflowGoal): void {
    if (!goal || typeof goal !== "object") {
      throw new Error("WorkflowGoal must be an object");
    }
    this.assertNonEmptyString(goal.workspaceId, "WorkflowGoal.workspaceId");
    this.assertNonEmptyString(goal.objective, "WorkflowGoal.objective");
  }

  private cloneGoal(goal: WorkflowGoal): WorkflowGoal {
    const cloned: WorkflowGoal = {
      workspaceId: goal.workspaceId,
      objective: goal.objective,
    };
    if (goal.metadata !== undefined) {
      cloned.metadata = { ...goal.metadata };
    }
    return cloned;
  }

  private assertNonEmptyString(value: unknown, label: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }
}
