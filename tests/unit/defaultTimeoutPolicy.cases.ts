/**
 * Unit-level cases for `DefaultTimeoutPolicy`.
 *
 * Executed via:
 *
 *   pnpm validate:reliability:timeout
 */
export const DEFAULT_TIMEOUT_POLICY_UNIT_CASES = [
  "module_constant",
  "success_before_timeout",
  "timeout_throws",
  "invalid_timeout_ms",
] as const;
