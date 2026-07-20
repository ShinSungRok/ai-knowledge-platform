import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeInput } from "./McpToolInvokeInput";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";

/**
 * Port for discovering and invoking registered MCP tools by name.
 *
 * `listTools` returns every registered tool's {@link McpToolDefinition}.
 * `invoke` accepts a free-form tool name (not limited to known
 * {@link McpToolName} values) so unknown names can be rejected as
 * structured `ok: false` results rather than type-system impossibilities.
 * Concrete adapters live under `app/knowledge/mcp` and are wired only
 * at the composition root; no adapter may import an MCP SDK or open a
 * network socket.
 */
export interface McpToolRegistry {
  listTools(): Promise<McpToolDefinition[]>;
  invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult>;
}
