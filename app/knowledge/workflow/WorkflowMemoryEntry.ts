import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowHandoffKind } from "./WorkflowHandoffKind";
import type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
import type { WorkflowRunId } from "./WorkflowRunId";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * One Shared Workflow Memory entry scoped to a workspace + workflow run.
 *
 * Distinct from Project 2 session {@link MemoryEntry}. Not a Knowledge
 * search substitute.
 */
export interface WorkflowMemoryEntry {
  id: string;
  workspaceId: string;
  workflowRunId: WorkflowRunId;
  kind: WorkflowMemoryEntryKind;
  content: string;
  /** 1-based append order within the workflow run. */
  sequence: number;
  agentId?: WorkflowAgentId;
  stepId?: WorkflowStepId;
  /** Present when `kind === "handoff"`. */
  handoffKind?: WorkflowHandoffKind;
}
