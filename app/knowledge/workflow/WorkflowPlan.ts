import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowPlanStep } from "./WorkflowPlanStep";

/**
 * Ordered plan for one {@link WorkflowGoal}. Steps are readonly —
 * execution never mutates the plan's step list.
 */
export interface WorkflowPlan {
  goal: WorkflowGoal;
  steps: readonly WorkflowPlanStep[];
}
