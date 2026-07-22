import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowRunResult } from "./WorkflowRunResult";

/**
 * Port for running a Multi-Agent workflow: plan → agent invoke → result.
 *
 * Explicit Handoff message contracts and Shared Workflow Memory remain
 * deferred. Concrete adapters compose planner / registry / invoker
 * ports rather than mixing those concerns into one class.
 */
export interface WorkflowOrchestrator {
  run(goal: WorkflowGoal): Promise<WorkflowRunResult>;
}
