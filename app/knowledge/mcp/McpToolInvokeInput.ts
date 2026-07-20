/**
 * Input for invoking a single MCP tool by name with a free-form
 * argument bag. `name` is a plain `string` (not limited to known
 * {@link McpToolName} values) so a registry can accept unknown names
 * and return structured `ok: false` results. Argument shape validation
 * belongs to the tool adapter (or registry), not this
 * transport-independent contract type.
 */
export interface McpToolInvokeInput {
  name: string;
  arguments: Record<string, unknown>;
}
