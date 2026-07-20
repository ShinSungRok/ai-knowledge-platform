/**
 * Unit-level cases for the `app/knowledge/mcp` contract
 * (`McpToolName`, `McpToolDefinition`, `McpToolInvokeInput`,
 * `McpToolInvokeResult`, `McpTool`).
 *
 * Executed via:
 *
 *   pnpm validate:mcp:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_MCP is exported with its expected value
 * - McpTool is implementable from just the exported contract types
 *   (no concrete adapter exists yet) and its `invoke` method is
 *   callable, returning a `McpToolInvokeResult`-shaped success
 * - McpToolInvokeResult accommodates an ok=false error shape without
 *   a result
 * - the top-level app/knowledge barrel re-exports McpTool (and related
 *   contract types), verified via a compile-time type-assignability
 *   check
 */
export const MCP_TOOL_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "mcp_tool_port_contract_is_implementable_and_callable",
  "mcp_tool_accommodates_empty_error_result_shape",
  "top_level_barrel_exports_contract_types",
] as const;
