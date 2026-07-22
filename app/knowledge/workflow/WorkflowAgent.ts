import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";

/**
 * Minimal Multi-Agent participant port: identity only.
 *
 * No `run` / invoke API yet — WorkflowOrchestrator and handoff remain
 * deferred beyond the Role Contract.
 */
export interface WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;
}
