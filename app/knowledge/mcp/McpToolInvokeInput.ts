import type { McpToolName } from "./McpToolName";

/**
 * Input for invoking a single MCP tool by name with a free-form
 * argument bag. Argument shape validation belongs to the tool adapter
 * (or a later registry), not this transport-independent contract type.
 */
export interface McpToolInvokeInput {
  name: McpToolName;
  arguments: Record<string, unknown>;
}
