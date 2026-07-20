import type { AgentGoal } from "./AgentGoal";
import type { AgentPlanStep } from "./AgentPlanStep";

/**
 * Ordered plan produced by an {@link AgentPlanner} for a single
 * {@link AgentGoal}. `steps` is readonly — execution never mutates the
 * plan's step list.
 */
export interface AgentPlan {
  goal: AgentGoal;
  steps: readonly AgentPlanStep[];
}
