import type { McpTool } from "./McpTool";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeInput } from "./McpToolInvokeInput";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";
import type { McpToolRegistry } from "./McpToolRegistry";

/**
 * Default {@link McpToolRegistry} adapter: holds a readonly array of
 * {@link McpTool} ports, rejects duplicate tool names at construction,
 * lists definitions in name-ascending order, and delegates known
 * invokes while returning a structured unknown-tool error for any
 * other name — never throws for unknown tools.
 *
 * Depends only on the `McpTool` port array — never on a concrete tool
 * class, MCP SDK, or network transport.
 */
export class DefaultMcpToolRegistry implements McpToolRegistry {
  private readonly toolsByName: Map<string, McpTool>;

  constructor(private readonly tools: readonly McpTool[]) {
    if (!Array.isArray(tools)) {
      throw new Error("DefaultMcpToolRegistry tools must be an array");
    }
    this.toolsByName = new Map();
    for (const tool of tools) {
      if (!tool || typeof tool !== "object") {
        throw new Error("DefaultMcpToolRegistry tools must contain McpTool objects");
      }
      if (!tool.definition || typeof tool.definition.name !== "string") {
        throw new Error("DefaultMcpToolRegistry tool definition.name must be a string");
      }
      if (this.toolsByName.has(tool.definition.name)) {
        throw new Error(
          `Duplicate MCP tool name: ${tool.definition.name}`,
        );
      }
      this.toolsByName.set(tool.definition.name, tool);
    }
  }

  async listTools(): Promise<McpToolDefinition[]> {
    return [...this.tools]
      .map((tool) => tool.definition)
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  async invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult> {
    if (!input || typeof input !== "object") {
      throw new Error("McpToolInvokeInput must be an object");
    }
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new Error("McpToolInvokeInput.name must be a non-empty string");
    }
    if (
      !input.arguments ||
      typeof input.arguments !== "object" ||
      Array.isArray(input.arguments)
    ) {
      throw new Error("McpToolInvokeInput.arguments must be an object");
    }

    const tool = this.toolsByName.get(input.name);
    if (!tool) {
      return {
        ok: false,
        toolName: input.name,
        error: `Unknown MCP tool: ${input.name}`,
      };
    }

    return tool.invoke(input.arguments);
  }
}
