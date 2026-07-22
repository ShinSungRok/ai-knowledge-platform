import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * One planned Multi-Agent step. `input` is an opaque string payload —
 * not an explicit Handoff message type (deferred).
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
