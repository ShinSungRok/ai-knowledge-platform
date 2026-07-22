import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * Input for invoking one Multi-Agent participant on a plan step.
 *
 * Not an explicit Handoff message schema — opaque `input` string only.
 */
export interface WorkflowAgentInvokeInput {
  workspaceId: string;
  agentId: WorkflowAgentId;
  role: WorkflowAgentRole;
  input: string;
  stepId?: WorkflowStepId;
}
