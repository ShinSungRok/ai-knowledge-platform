import type { McpToolName } from "./McpToolName";

/**
 * Transport-independent description of a single MCP tool capability:
 * its stable name, a human-readable description, and the argument keys
 * callers are expected to supply. `inputKeys` is a readonly string
 * array — never a schema object or SDK type — so this contract stays
 * free of any MCP host / JSON-RPC / network dependency.
 */
export interface McpToolDefinition {
  name: McpToolName;
  description: string;
  inputKeys: readonly string[];
}
