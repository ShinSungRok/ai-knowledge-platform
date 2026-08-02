import type { WorkflowMemoryAppendInput } from "./WorkflowMemoryAppendInput";
import type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
import type { WorkflowRunId } from "./WorkflowRunId";

/**
 * Port for workspace/workflow-run scoped Shared Workflow Memory.
 *
 * Records Multi-Agent run artifacts (objective, step outputs, handoffs).
 * This is **not** Project 2 session {@link MemoryStore} and does **not**
 * replace Knowledge document/chunk/vector search.
 */
export interface WorkflowMemoryStore {
  append(input: WorkflowMemoryAppendInput): Promise<WorkflowMemoryEntry>;
  listByRun(
    workspaceId: string,
    workflowRunId: WorkflowRunId,
  ): Promise<readonly WorkflowMemoryEntry[]>;
}
