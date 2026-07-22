import type { WorkflowPlan } from "./WorkflowPlan";
import type { WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";
import type { WorkflowStepResult } from "./WorkflowStepResult";

/**
 * Result of one {@link WorkflowOrchestrator} run.
 *
 * `workflowRunId` lets callers `WorkflowMemoryStore.listByRun` after the
 * run (Shared Workflow Memory is write-only during orchestration in v1).
 */
export interface WorkflowRunResult {
  plan: WorkflowPlan;
  stepResults: readonly WorkflowStepResult[];
  status: WorkflowRunStatus;
  workflowRunId: WorkflowRunId;
  summary?: string;
}
