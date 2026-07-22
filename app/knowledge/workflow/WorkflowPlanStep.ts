import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * One planned Multi-Agent step. `input` is the planned opaque payload
 * (typically `goal.objective`). Runtime handoff may override this for
 * steps after the first — see {@link WorkflowHandoff}.
 *
 * At execution time `role` must match the registered agent's descriptor
 * role.
 */
export interface WorkflowPlanStep {
  id: WorkflowStepId;
  agentId: WorkflowAgentId;
  role: WorkflowAgentRole;
  input: string;
}
