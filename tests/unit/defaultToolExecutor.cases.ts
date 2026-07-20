/**
 * Unit-level cases for `DefaultToolExecutor`
 * (`app/knowledge/tools/DefaultToolExecutor.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:tools:executor
 *
 * Covered behaviors:
 * - depends only on the `McpToolRegistry` port
 * - invalid request returns status=invalid_request without calling the
 *   registry
 * - ok=true MCP result maps to status=success
 * - ok=false with "Unknown MCP tool: " prefix maps to status=unknown_tool
 * - other ok=false MCP results map to status=failure
 * - a registry throw maps to status=failure without rethrowing
 */
export const DEFAULT_TOOL_EXECUTOR_UNIT_CASES = [
  "depends_only_on_mcp_tool_registry_port",
  "invalid_request_short_circuits",
  "success_mapping",
  "unknown_tool_mapping",
  "failure_mapping",
  "registry_throw_mapping",
] as const;
