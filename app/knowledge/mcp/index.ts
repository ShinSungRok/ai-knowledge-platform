/**
 * Module: `app/knowledge/mcp`
 *
 * Transport-independent MCP tool capability exposure.
 *
 * `McpToolName`, `McpToolDefinition`, `McpToolInvokeInput`,
 * `McpToolInvokeResult`, and the `McpTool` port (Task 50) define how a
 * cited grounded answer (and later tools) can be exposed as MCP
 * capabilities without Domain/RAG business-logic duplication and
 * without an MCP SDK, network transport, or JSON-RPC server.
 * `GenerateCitedGroundedAnswerMcpTool` (Task 51) is the first concrete
 * tool adapter: it injects only `GenerateCitedGroundedAnswerUseCase`
 * and converts validation / use-case failures into non-throwing
 * `ok: false` results. `DefaultMcpToolRegistry` (Task 52) holds a
 * readonly `McpTool[]`, rejects duplicate names at construction, lists
 * definitions in name-ascending order, and returns structured
 * unknown-tool errors without throwing.
 */
export const KNOWLEDGE_MODULE_MCP = "app/knowledge/mcp" as const;

export type { McpToolName } from "./McpToolName";
export type { McpToolDefinition } from "./McpToolDefinition";
export type { McpToolInvokeInput } from "./McpToolInvokeInput";
export type { McpToolInvokeResult } from "./McpToolInvokeResult";
export type { McpTool } from "./McpTool";
export type { McpToolRegistry } from "./McpToolRegistry";
export { GenerateCitedGroundedAnswerMcpTool } from "./GenerateCitedGroundedAnswerMcpTool";
export { DefaultMcpToolRegistry } from "./DefaultMcpToolRegistry";
