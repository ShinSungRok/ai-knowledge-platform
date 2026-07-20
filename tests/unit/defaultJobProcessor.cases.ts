/**
 * Unit-level cases for DefaultJobProcessor.
 *
 * Executed via:
 *
 *   pnpm validate:jobs:processor
 */
export const DEFAULT_JOB_PROCESSOR_UNIT_CASES = [
  "depends_only_on_job_store_and_handlers",
  "rejects_duplicate_handler_types",
  "completes_pending_sync_job",
  "retries_then_fails_on_handler_throw",
  "fails_when_handler_missing",
  "picks_oldest_pending_first",
  "rejects_invalid_workspace_id",
] as const;
