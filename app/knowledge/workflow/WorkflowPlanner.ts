import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowPlan } from "./WorkflowPlan";

/**
 * Port for producing a Multi-Agent {@link WorkflowPlan} from a goal.
 */
export interface WorkflowPlanner {
  plan(goal: WorkflowGoal): Promise<WorkflowPlan>;
}
