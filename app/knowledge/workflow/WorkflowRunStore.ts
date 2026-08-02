import type { WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowRunRecord } from "./WorkflowRunRecord";
import type { WorkflowRunResult } from "./WorkflowRunResult";

/**
 * Input for persisting one completed workflow run.
 */
export interface WorkflowRunSaveInput {
  workspaceId: string;
  objective: string;
  result: WorkflowRunResult;
}

/**
 * Port for workspace-scoped Multi-Agent workflow run persistence, so a
 * run started via `POST /workflow-runs` can later be fetched via
 * `GET /workflow-runs/:id`.
 *
 * Persists run results only — does not replace {@link WorkflowMemoryStore}
 * (Shared Workflow Memory) or Project 4 {@link ExperimentRunStore}.
 */
export interface WorkflowRunStore {
  save(input: WorkflowRunSaveInput): Promise<WorkflowRunRecord>;
  getById(
    workspaceId: string,
    workflowRunId: WorkflowRunId,
  ): Promise<WorkflowRunRecord | null>;
}
