import type { AgentGoal } from "./AgentGoal";
import type { AgentPlan } from "./AgentPlan";

/**
 * Port for producing an {@link AgentPlan} from an {@link AgentGoal}.
 * Concrete adapters must not execute tools, review results, or call an
 * LLM unless a later task explicitly scopes that behavior.
 */
export interface AgentPlanner {
  plan(goal: AgentGoal): Promise<AgentPlan>;
}
