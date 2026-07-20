/**
 * Unit-level cases for cited-answer / health API controllers.
 *
 * Executed via:
 *
 *   pnpm validate:api:cited-answer
 */
export const CITED_GROUNDED_ANSWER_CONTROLLER_UNIT_CASES = [
  "module_constant",
  "health_ok",
  "cited_answer_success",
  "forbidden_without_header_403",
  "forbidden_on_mismatch_403",
  "invalid_input_400",
  "method_not_allowed_405",
  "runtime_throw_500",
  "router_wires_health_and_cited_answer",
  "controller_depends_only_on_runtime_and_guard",
] as const;
