import type { McpJsonRpcId } from "./McpJsonRpcId";

/**
 * JSON-RPC 2.0 request for the MCP transport boundary.
 * Official MCP SDK types are intentionally not used.
 */
export type McpJsonRpcRequest = {
  jsonrpc: "2.0";
  id: McpJsonRpcId;
  method: string;
  params?: Readonly<Record<string, unknown>>;
};
