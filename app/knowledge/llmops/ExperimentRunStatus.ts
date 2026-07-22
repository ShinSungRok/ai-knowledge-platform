/**
 * Lifecycle status of a single {@link ExperimentRunRecord}.
 *
 * Same string union shape as Project 2 {@link JobStatus}, but a distinct
 * LLMOps type — do not conflate with jobs or workflow run status.
 */
export type ExperimentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";
