import type { WorkflowAgentId } from "./WorkflowAgentId";
import type { WorkflowHandoffKind } from "./WorkflowHandoffKind";
import type { WorkflowStepId } from "./WorkflowStepId";

/**
 * Explicit Agent Handoff / Delegation message between two workflow
 * steps. Shared Workflow Memory remains deferred — this type is the
 * in-run contract only (not a persisted memory store).
 *
 * Validation rules (enforced by builder / orchestrator):
 * - `fromAgentId` / `toAgentId` non-empty and distinct (same-agent
 *   self-handoff rejected for sequential and delegation builders)
 * - `payload` non-empty string
 * - `workspaceId` non-empty
 */
export interface WorkflowHandoff {
  kind: WorkflowHandoffKind;
  fromAgentId: WorkflowAgentId;
  toAgentId: WorkflowAgentId;
  fromStepId: WorkflowStepId;
  toStepId: WorkflowStepId;
  workspaceId: string;
  payload: string;
  reason?: string;
}
