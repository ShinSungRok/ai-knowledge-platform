/**
 * Module: `app/knowledge/mcp`
 *
 * Transport-independent MCP tool capability exposure.
 *
 * `McpToolName`, `McpToolDefinition`, `McpToolInvokeInput`,
 * `McpToolInvokeResult`, and the `McpTool` port (Task 50) define how a
 * cited grounded answer (and later tools) can be exposed as MCP
 * capabilities without Domain/RAG business-logic duplication and
 * without an MCP SDK, network transport, or JSON-RPC server. A
 * concrete tool adapter and registry are later tasks.
 */
export const KNOWLEDGE_MODULE_MCP = "app/knowledge/mcp" as const;

export type { McpToolName } from "./McpToolName";
export type { McpToolDefinition } from "./McpToolDefinition";
export type { McpToolInvokeInput } from "./McpToolInvokeInput";
export type { McpToolInvokeResult } from "./McpToolInvokeResult";
export type { McpTool } from "./McpTool";
