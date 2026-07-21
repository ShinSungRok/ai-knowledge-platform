import type { McpJsonRpcHandler } from "./McpJsonRpcHandler";
import type { McpJsonRpcId } from "./McpJsonRpcId";
import type { McpJsonRpcRequest } from "./McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "./McpJsonRpcResponse";
import {
  MCP_METHOD_TOOLS_CALL,
  MCP_METHOD_TOOLS_LIST,
} from "./McpJsonRpcMethods";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolRegistry } from "./McpToolRegistry";

/**
 * Deterministic {@link McpJsonRpcHandler} that delegates to
 * {@link McpToolRegistry}. No official MCP SDK.
 */
export class DefaultMcpJsonRpcHandler implements McpJsonRpcHandler {
  constructor(private readonly registry: McpToolRegistry) {}

  async handle(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    try {
      if (!this.isValidRequest(request)) {
        return this.errorResponse(
          this.safeId(request),
          -32600,
          "Invalid Request",
        );
      }

      if (request.method === MCP_METHOD_TOOLS_LIST) {
        const tools = await this.registry.listTools();
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: tools.map((tool) => this.toListTool(tool)) },
        };
      }

      if (request.method === MCP_METHOD_TOOLS_CALL) {
        return await this.handleToolsCall(request);
      }

      return this.errorResponse(request.id, -32601, "Method not found");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : "Internal error";
      return this.errorResponse(
        this.safeId(request),
        -32603,
        "Internal error",
        message,
      );
    }
  }

  private async handleToolsCall(
    request: McpJsonRpcRequest,
  ): Promise<McpJsonRpcResponse> {
    const params = request.params;
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return this.errorResponse(request.id, -32602, "Invalid params");
    }
    const name = params["name"];
    const args = params["arguments"];
    if (typeof name !== "string" || name.trim().length === 0) {
      return this.errorResponse(request.id, -32602, "Invalid params");
    }
    if (
      args === undefined ||
      args === null ||
      typeof args !== "object" ||
      Array.isArray(args)
    ) {
      return this.errorResponse(request.id, -32602, "Invalid params");
    }

    const invokeResult = await this.registry.invoke({
      name,
      arguments: args as Readonly<Record<string, unknown>>,
    });

    if (invokeResult.ok) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(invokeResult.result),
            },
          ],
          isError: false,
        },
      };
    }

    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        content: [
          {
            type: "text",
            text: invokeResult.error ?? "Tool failed",
          },
        ],
        isError: true,
      },
    };
  }

  private toListTool(tool: McpToolDefinition): {
    name: string;
    description: string;
    inputSchema: {
      type: "object";
      properties: Record<string, { type: "string" }>;
      required: string[];
    };
  } {
    const properties: Record<string, { type: "string" }> = {};
    for (const key of tool.inputKeys) {
      properties[key] = { type: "string" };
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties,
        required: [...tool.inputKeys],
      },
    };
  }

  private isValidRequest(request: McpJsonRpcRequest): boolean {
    if (!request || typeof request !== "object") {
      return false;
    }
    if (request.jsonrpc !== "2.0") {
      return false;
    }
    if (typeof request.method !== "string" || request.method.trim().length === 0) {
      return false;
    }
    const id = request.id;
    if (
      !(
        id === null ||
        typeof id === "string" ||
        typeof id === "number"
      )
    ) {
      return false;
    }
    if (
      request.params !== undefined &&
      (typeof request.params !== "object" ||
        request.params === null ||
        Array.isArray(request.params))
    ) {
      return false;
    }
    return true;
  }

  private safeId(request: unknown): McpJsonRpcId {
    if (
      request &&
      typeof request === "object" &&
      "id" in request &&
      ((request as { id: unknown }).id === null ||
        typeof (request as { id: unknown }).id === "string" ||
        typeof (request as { id: unknown }).id === "number")
    ) {
      return (request as { id: McpJsonRpcId }).id;
    }
    return null;
  }

  private errorResponse(
    id: McpJsonRpcId,
    code: number,
    message: string,
    data?: unknown,
  ): McpJsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: data === undefined ? { code, message } : { code, message, data },
    };
  }
}
