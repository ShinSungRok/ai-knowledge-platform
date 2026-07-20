/**
 * Unit-level cases for `DefaultWorkspaceAuthorizer`.
 *
 * Executed via:
 *
 *   pnpm validate:security:workspace
 */
export const DEFAULT_WORKSPACE_AUTHORIZER_UNIT_CASES = [
  "module_constant",
  "allows_matching",
  "denies_mismatch",
  "rejects_empty_ids",
] as const;
