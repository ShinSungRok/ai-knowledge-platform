/**
 * Unit-level cases for `DefaultRetryPolicy`.
 *
 * Executed via:
 *
 *   pnpm validate:reliability:retry
 */
export const DEFAULT_RETRY_POLICY_UNIT_CASES = [
  "module_constant",
  "success_first_attempt",
  "retries_then_succeeds",
  "final_failure_last_error",
  "invalid_max_attempts",
] as const;
