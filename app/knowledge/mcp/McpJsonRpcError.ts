/**
 * JSON-RPC 2.0 error object.
 */
export type McpJsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};
