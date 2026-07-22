/**
 * Structured result of one {@link WorkflowAgentInvoker} call.
 *
 * Expected validation/agent failures use `ok: false` rather than throw.
 */
export interface WorkflowAgentInvokeResult {
  ok: boolean;
  output: string;
  error?: string;
}
