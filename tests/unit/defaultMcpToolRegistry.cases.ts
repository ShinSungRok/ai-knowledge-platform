/**
 * Unit-level cases for `DefaultMcpToolRegistry`
 * (`app/knowledge/mcp/DefaultMcpToolRegistry.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:mcp:registry
 *
 * Covered behaviors:
 * - imports only McpTool ports, never a concrete tool adapter
 * - listTools returns definitions in name-ascending order
 * - constructor rejects duplicate tool names
 * - invoke delegates arguments unchanged to a known registered tool
 * - invoke returns ok=false for an unknown tool name (echoing the
 *   requested name) without throwing
 * - invoke rejects an invalid McpToolInvokeInput without calling a tool
 */
export const DEFAULT_MCP_TOOL_REGISTRY_UNIT_CASES = [
  "depends_only_on_mcp_tool_port",
  "list_tools_returns_name_ascending_order",
  "rejects_duplicate_tool_names",
  "known_tool_delegation",
  "unknown_tool_error",
  "rejects_invalid_registry_input",
] as const;
