import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowHandoff } from "./WorkflowHandoff";
import type { WorkflowStepId } from "./WorkflowStepId";
import type { WorkflowStepStatus } from "./WorkflowStepStatus";

/**
 * Recorded result for one workflow plan step.
 *
 * `handoff` is set only when this step consumed a prior-step
 * {@link WorkflowHandoff} (steps after index 0).
 */
export interface WorkflowStepResult {
  stepId: WorkflowStepId;
  agentId: WorkflowAgentId;
  role: WorkflowAgentRole;
  status: WorkflowStepStatus;
  output: string;
  error?: string;
  handoff?: WorkflowHandoff;
}
