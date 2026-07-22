/**
 * Opaque identifier for one Multi-Agent workflow run's shared memory scope.
 *
 * Distinct from Project 2 session `sessionId` under `app/knowledge/memory`.
 */
export type WorkflowRunId = string & {
  readonly __brand: "WorkflowRunId";
};

/**
 * Normalize and brand a workflow run id. Trims whitespace; rejects empty.
 */
export function asWorkflowRunId(id: string): WorkflowRunId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("WorkflowRunId must be a non-empty string");
  }
  return id.trim() as WorkflowRunId;
}
