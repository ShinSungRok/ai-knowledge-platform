import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";

/**
 * Port for a single transport-independent MCP tool capability.
 *
 * `definition` describes the tool; `invoke` accepts a free-form
 * argument bag and returns a structured {@link McpToolInvokeResult}
 * without throwing for expected validation or use-case failures.
 * Concrete adapters live under `app/knowledge/mcp` and are wired only
 * at the composition root; no adapter may import an MCP SDK, open a
 * network socket, or duplicate Domain/RAG business logic — it only
 * exposes an existing application use case.
 */
export interface McpTool {
  readonly definition: McpToolDefinition;
  invoke(args: Record<string, unknown>): Promise<McpToolInvokeResult>;
}
