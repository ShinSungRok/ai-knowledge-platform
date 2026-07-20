/**
 * Unit-level cases for `InvokeMcpToolUseCase`
 * (`app/knowledge/application/InvokeMcpToolUseCase.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:application:mcp-invoke
 *
 * Covered behaviors:
 * - depends only on the `McpToolRegistry` port, verified via a static
 *   source-scan for forbidden concrete-adapter imports
 * - execute() delegates `{ name, arguments }` to
 *   `McpToolRegistry.invoke` and returns the result unchanged
 * - rejects invalid name/arguments input without calling the registry
 */
export const INVOKE_MCP_TOOL_USE_CASE_UNIT_CASES = [
  "depends_only_on_mcp_tool_registry_port",
  "valid_delegation_and_unchanged_result",
  "rejects_invalid_input_without_calling_registry",
] as const;
