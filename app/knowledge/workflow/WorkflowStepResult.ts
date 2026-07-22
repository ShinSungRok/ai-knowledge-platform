import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowStepId } from "./WorkflowStepId";
import type { WorkflowStepStatus } from "./WorkflowStepStatus";

/**
 * Recorded result for one workflow plan step.
 */
export interface WorkflowStepResult {
  stepId: WorkflowStepId;
  agentId: WorkflowAgentId;
  role: WorkflowAgentRole;
  status: WorkflowStepStatus;
  output: string;
  error?: string;
}
