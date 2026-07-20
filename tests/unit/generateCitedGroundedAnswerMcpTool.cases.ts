/**
 * Unit-level cases for `GenerateCitedGroundedAnswerMcpTool`
 * (`app/knowledge/mcp/GenerateCitedGroundedAnswerMcpTool.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:mcp:cited-answer-tool
 *
 * Covered behaviors:
 * - depends only on `GenerateCitedGroundedAnswerUseCase`, verified via
 *   a static source-scan for forbidden concrete-adapter imports
 * - definition.name / description / inputKeys are fixed constants
 * - valid invoke returns ok=true with the use case's CitedGroundedAnswer
 *   and maps the four argument keys correctly
 * - invalid arguments return ok=false without calling the use case
 * - a use-case throw is mapped to ok=false with the error message,
 *   without rethrowing
 */
export const GENERATE_CITED_GROUNDED_ANSWER_MCP_TOOL_UNIT_CASES = [
  "depends_only_on_cited_answer_use_case",
  "definition_constants_are_fixed",
  "valid_invoke_success_path",
  "invalid_input_short_circuits_without_use_case_call",
  "use_case_error_mapped_to_non_throwing_result",
] as const;
