/**
 * Kind of Shared Workflow Memory entry for one Multi-Agent run.
 *
 * Not Project 2 session {@link MemoryEntryRole} — do not conflate.
 */
export type WorkflowMemoryEntryKind =
  | "objective"
  | "step_output"
  | "handoff"
  | "note";
