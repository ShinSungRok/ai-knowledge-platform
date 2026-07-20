/**
 * Unit-level cases for `DefaultHttpRouter`.
 *
 * Executed via:
 *
 *   pnpm validate:http:router
 */
export const HTTP_ROUTER_UNIT_CASES = [
  "module_constant",
  "exact_match_dispatch",
  "not_found_json",
  "method_path_exactness",
] as const;
