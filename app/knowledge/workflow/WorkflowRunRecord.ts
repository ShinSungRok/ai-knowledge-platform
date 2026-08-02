import type { WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowRunResult } from "./WorkflowRunResult";

/**
 * Persisted record of one Multi-Agent workflow run, as stored by
 * {@link WorkflowRunStore} for later HTTP retrieval.
 *
 * Distinct from Project 4 {@link ExperimentRunRecord} and Project 2
 * {@link JobRecord}.
 */
export interface WorkflowRunRecord {
  workflowRunId: WorkflowRunId;
  workspaceId: string;
  objective: string;
  result: WorkflowRunResult;
}
