/**
 * Module: `app/knowledge/mcp`
 *
 * Transport-independent MCP tool registry plus JSON-RPC handler and
 * HTTP + stdio transport boundaries. Official MCP SDK remains deferred.
 *
 * `McpTool` / `McpToolRegistry` expose application capabilities without
 * Domain/RAG duplication. `McpJsonRpcRequest` / `McpJsonRpcResponse` /
 * `McpJsonRpcHandler` define a dependency-free JSON-RPC subset for
 * `tools/list` and `tools/call`. `McpStdioLineReader` / `McpStdioLineWriter`
 * define newline-delimited stdio IO for local host sessions.
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
export type { McpStdioLineReader } from "./McpStdioLineReader";
export type { McpStdioLineWriter } from "./McpStdioLineWriter";
export type { McpStdioSessionConfig } from "./McpStdioSessionConfig";
export {
  DEFAULT_MCP_STDIO_IGNORE_EMPTY_LINES,
  DEFAULT_MCP_STDIO_MAX_LINE_BYTES,
  resolveMcpStdioSessionConfig,
} from "./McpStdioSessionConfig";
export { StdioMcpJsonRpcSession } from "./StdioMcpJsonRpcSession";
export { FakeMcpStdioLineReader } from "./FakeMcpStdioLineReader";
export { FakeMcpStdioLineWriter } from "./FakeMcpStdioLineWriter";
export {
  NodeMcpStdioLineReader,
  NodeMcpStdioLineWriter,
} from "./NodeMcpStdioLines";
