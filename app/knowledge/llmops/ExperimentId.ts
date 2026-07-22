/**
 * Opaque identifier for one LLMOps experiment (grouping of runs).
 *
 * Distinct from Project 2 job ids and Project 3 {@link WorkflowRunId}.
 */
export type ExperimentId = string & {
  readonly __brand: "ExperimentId";
};

/**
 * Normalize and brand an experiment id. Trims whitespace; rejects empty.
 */
export function asExperimentId(id: string): ExperimentId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("ExperimentId must be a non-empty string");
  }
  return id.trim() as ExperimentId;
}
