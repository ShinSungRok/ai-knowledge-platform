/**
 * Opaque identifier for one experiment run under an {@link ExperimentId}.
 *
 * Distinct from Project 2 {@link JobRecord} ids and Project 3
 * {@link WorkflowRunId}.
 */
export type ExperimentRunId = string & {
  readonly __brand: "ExperimentRunId";
};

/**
 * Normalize and brand an experiment run id. Trims whitespace; rejects empty.
 */
export function asExperimentRunId(id: string): ExperimentRunId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("ExperimentRunId must be a non-empty string");
  }
  return id.trim() as ExperimentRunId;
}
