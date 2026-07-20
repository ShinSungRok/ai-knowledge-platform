/** Unit cases for EnqueueJobUseCase. */
export const ENQUEUE_JOB_USE_CASE_UNIT_CASES = [
  "depends_only_on_job_store_port",
  "execute_delegates_to_enqueue",
  "invalid_input_rejected",
] as const;
