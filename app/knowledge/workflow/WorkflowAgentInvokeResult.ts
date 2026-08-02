import type { WorkflowAgentId } from "./WorkflowAgentId";

/**
 * Structured result of one {@link WorkflowAgentInvoker} call.
 *
 * Expected validation/agent failures use `ok: false` rather than throw.
 *
 * `delegateToAgentId` is an optional agent-initiated signal naming a
 * registered agent of the *same role* as the next planned step that
 * should execute it instead of the planner's default pick. Ignored (falls
 * back to the planned agent) when it names an unregistered or
 * wrong-role agent.
 */
export interface WorkflowAgentInvokeResult {
  ok: boolean;
  output: string;
  error?: string;
  delegateToAgentId?: WorkflowAgentId;
}
