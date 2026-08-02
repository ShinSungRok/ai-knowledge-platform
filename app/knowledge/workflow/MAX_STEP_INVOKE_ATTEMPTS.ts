/**
 * Maximum total {@link WorkflowAgentInvoker.invoke} attempts per step in
 * {@link DefaultWorkflowOrchestrator} (1 initial attempt + 1 retry).
 * Retries only apply to invoke failures (throw or `ok:false`), never to
 * structural pre-invoke failures (unknown agent id, role mismatch,
 * handoff-build throw), which are deterministic on the same inputs.
 */
export const MAX_STEP_INVOKE_ATTEMPTS = 2;
