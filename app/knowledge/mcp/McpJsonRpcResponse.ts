import type { McpJsonRpcError } from "./McpJsonRpcError";
import type { McpJsonRpcId } from "./McpJsonRpcId";

/**
 * JSON-RPC 2.0 response for the MCP transport boundary.
 */
export type McpJsonRpcResponse = {
  jsonrpc: "2.0";
  id: McpJsonRpcId;
  result?: unknown;
  error?: McpJsonRpcError;
};
