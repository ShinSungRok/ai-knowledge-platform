import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * Result of one {@link WorkflowOrchestrator} run.
 */
export interface WorkflowRunResult {
  plan: WorkflowPlan;
  stepResults: readonly WorkflowStepResult[];
  status: WorkflowRunStatus;
  summary?: string;
}
