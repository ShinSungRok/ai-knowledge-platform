import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";

/**
 * Minimal Multi-Agent participant port: identity only.
 *
 * No `run` / invoke API — step execution is owned by
 * {@link WorkflowAgentInvoker} / {@link WorkflowOrchestrator}, not the
 * agent identity port. Handoff remains deferred.
 */
export interface WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;
}
