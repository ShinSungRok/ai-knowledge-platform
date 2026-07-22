import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowHandoffKind } from "./WorkflowHandoffKind";
import type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
import type { WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * Input for appending one Shared Workflow Memory entry.
 * `id` and `sequence` are assigned by {@link WorkflowMemoryStore}.
 */
export interface WorkflowMemoryAppendInput {
  workspaceId: string;
  workflowRunId: WorkflowRunId;
  kind: WorkflowMemoryEntryKind;
  content: string;
  agentId?: WorkflowAgentId;
  stepId?: WorkflowStepId;
  handoffKind?: WorkflowHandoffKind;
}
