import type { McpJsonRpcRequest } from "./McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "./McpJsonRpcResponse";

/**
 * Port for handling transport-facing MCP JSON-RPC requests.
 *
 * Concrete adapters (in-process handler, HTTP controller) live under
 * `mcp` / `api` / composition. No official MCP SDK is required.
 */
export interface McpJsonRpcHandler {
  handle(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse>;
}
