import type { WorkflowGoal } from "./WorkflowGoal";
import type { WorkflowHandoff } from "./WorkflowHandoff";
import type { WorkflowPlanStep } from "./WorkflowPlanStep";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * Input for building one {@link WorkflowHandoff} from a completed prior
 * step into the next planned step.
 */
export interface WorkflowHandoffBuildInput {
  goal: WorkflowGoal;
  previous: WorkflowStepResult;
  next: WorkflowPlanStep;
}

/**
 * Port for producing an explicit Agent Handoff / Delegation message.
 *
 * Does not persist to Shared Workflow Memory (deferred).
 */
export interface WorkflowHandoffBuilder {
  build(input: WorkflowHandoffBuildInput): WorkflowHandoff;
}
