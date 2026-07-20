/**
 * Unit-level cases for `HttpWorkspaceGuard`.
 *
 * Executed via:
 *
 *   pnpm validate:security:http-guard
 */
export const HTTP_WORKSPACE_GUARD_UNIT_CASES = [
  "allows_matching_header",
  "header_case_insensitive",
  "missing_header",
  "denied_by_authorizer",
] as const;
