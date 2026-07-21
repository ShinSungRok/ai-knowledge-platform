/**
 * Module: `app/knowledge/mcp`
 *
 * Transport-independent MCP tool registry plus a JSON-RPC handler
 * boundary for network transports.
 *
 * `McpTool` / `McpToolRegistry` expose application capabilities without
 * Domain/RAG duplication. `McpJsonRpcRequest` / `McpJsonRpcResponse` /
 * `McpJsonRpcHandler` define a dependency-free JSON-RPC subset for
 * `tools/list` and `tools/call`. Official MCP SDK and stdio transport
 * remain out of scope.
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
export { DefaultMcpJsonRpcHandler } from "./DefaultMcpJsonRpcHandler";
export type { McpJsonRpcId } from "./McpJsonRpcId";
export type { McpJsonRpcRequest } from "./McpJsonRpcRequest";
export type { McpJsonRpcError } from "./McpJsonRpcError";
export type { McpJsonRpcResponse } from "./McpJsonRpcResponse";
export type { McpJsonRpcHandler } from "./McpJsonRpcHandler";
export {
  MCP_METHOD_TOOLS_CALL,
  MCP_METHOD_TOOLS_LIST,
} from "./McpJsonRpcMethods";
