/**
 * Opaque identifier for a Multi-Agent workflow participant.
 *
 * Non-empty enforcement lives in registry adapters, not at the type level.
 * Distinct from Project 2 single-agent internal step ids.
 */
export type WorkflowAgentId = string & {
  readonly __brand: "WorkflowAgentId";
};

/**
 * Cast a plain string to {@link WorkflowAgentId} for call sites that already
 * validated non-emptiness (or for fixtures). Prefer registry registration
 * paths that validate before storing.
 */
export function asWorkflowAgentId(id: string): WorkflowAgentId {
  return id as WorkflowAgentId;
}
