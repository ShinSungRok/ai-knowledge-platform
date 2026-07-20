import type { McpToolRegistry } from "../mcp/McpToolRegistry";
import type { McpToolInvokeResult } from "../mcp/McpToolInvokeResult";

/**
 * Input for invoking a registered MCP tool by name from the
 * application boundary. Kept separate from {@link McpToolInvokeInput}
 * so this use case owns its own validation contract rather than
 * reusing the mcp module's port input type directly.
 */
export interface InvokeMcpToolInput {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Invoke-MCP-tool use case: validate a tool name and argument bag at
 * the application boundary, then delegate to an {@link McpToolRegistry}
 * port and return its {@link McpToolInvokeResult} unchanged.
 *
 * Depends only on the registry port — never on a concrete MCP tool
 * adapter, registry adapter, MCP SDK, or network transport. Does not
 * interpret tool results or duplicate Domain/RAG business logic.
 */
export class InvokeMcpToolUseCase {
  constructor(private readonly mcpToolRegistry: McpToolRegistry) {}

  async execute(input: InvokeMcpToolInput): Promise<McpToolInvokeResult> {
    const validated = this.toInput(input);

    return this.mcpToolRegistry.invoke({
      name: validated.name,
      arguments: validated.arguments,
    });
  }

  private toInput(input: InvokeMcpToolInput): InvokeMcpToolInput {
    if (!input || typeof input !== "object") {
      throw new Error("InvokeMcpToolInput must be an object");
    }
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new Error("InvokeMcpToolInput.name must be a non-empty string");
    }
    if (
      !input.arguments ||
      typeof input.arguments !== "object" ||
      Array.isArray(input.arguments)
    ) {
      throw new Error("InvokeMcpToolInput.arguments must be an object");
    }
    return {
      name: input.name,
      arguments: input.arguments,
    };
  }
}
