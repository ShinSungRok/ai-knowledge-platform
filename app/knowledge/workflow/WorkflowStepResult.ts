import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowHandoff } from "./WorkflowHandoff";
import type { WorkflowStepId } from "./WorkflowStepId";
import type { WorkflowStepStatus } from "./WorkflowStepStatus";

/**
 * Recorded result for one workflow plan step.
 *
 * `handoff` is set only when this step consumed a prior-step
 * {@link WorkflowHandoff} (steps after index 0). `attempts` is set only
 * when the invoke was retried (> 1). `delegateToAgentId` is carried
 * through from the invoke result when the agent requested a specific
 * same-role delegate for the next step.
 */
export interface WorkflowStepResult {
  stepId: WorkflowStepId;
  agentId: WorkflowAgentId;
  role: WorkflowAgentRole;
  status: WorkflowStepStatus;
  output: string;
  error?: string;
  handoff?: WorkflowHandoff;
  attempts?: number;
  delegateToAgentId?: WorkflowAgentId;
}
