/**
 * Unit-level cases for `ObservingHttpRouter`.
 *
 * Executed via:
 *
 *   pnpm validate:http:observing
 */
export const OBSERVING_HTTP_ROUTER_UNIT_CASES = [
  "logs_and_metrics_on_success",
  "error_log_and_rethrow",
] as const;
