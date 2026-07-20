import type { McpToolRegistry } from "../mcp/McpToolRegistry";
import type { ToolCallRequest } from "./ToolCallRequest";
import type { ToolCallResult } from "./ToolCallResult";
import type { ToolExecutor } from "./ToolExecutor";

const UNKNOWN_TOOL_ERROR_PREFIX = "Unknown MCP tool: ";

/**
 * Default {@link ToolExecutor} adapter: validates a
 * {@link ToolCallRequest}, delegates to an {@link McpToolRegistry}
 * port, and maps the MCP invoke result onto a structured
 * {@link ToolCallResult} status — never throws for expected
 * validation, unknown-tool, or backend failures.
 *
 * Depends only on the `McpToolRegistry` port — never on an application
 * use case, concrete MCP tool/registry adapter, MCP SDK, or network
 * transport. This task validates `timeoutMs` as a positive integer but
 * does **not** enforce a timeout race; timeout enforcement is a later
 * task.
 */
export class DefaultToolExecutor implements ToolExecutor {
  constructor(private readonly mcpToolRegistry: McpToolRegistry) {}

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const startedAt = Date.now();
    const validated = this.toRequest(request);
    if (!validated.ok) {
      return {
        ok: false,
        status: "invalid_request",
        toolName: validated.toolName,
        error: validated.error,
        durationMs: this.elapsedMs(startedAt),
      };
    }

    try {
      const mcpResult = await this.mcpToolRegistry.invoke({
        name: validated.request.name,
        arguments: validated.request.arguments,
      });

      if (mcpResult.ok) {
        return {
          ok: true,
          status: "success",
          toolName: mcpResult.toolName,
          result: mcpResult.result,
          durationMs: this.elapsedMs(startedAt),
        };
      }

      const error = mcpResult.error ?? "MCP tool invoke failed";
      if (error.startsWith(UNKNOWN_TOOL_ERROR_PREFIX)) {
        return {
          ok: false,
          status: "unknown_tool",
          toolName: mcpResult.toolName,
          error,
          durationMs: this.elapsedMs(startedAt),
        };
      }

      return {
        ok: false,
        status: "failure",
        toolName: mcpResult.toolName,
        error,
        durationMs: this.elapsedMs(startedAt),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        status: "failure",
        toolName: validated.request.name,
        error: message,
        durationMs: this.elapsedMs(startedAt),
      };
    }
  }

  private toRequest(
    request: ToolCallRequest,
  ):
    | { ok: true; request: ToolCallRequest }
    | { ok: false; toolName: string; error: string } {
    if (!request || typeof request !== "object") {
      return {
        ok: false,
        toolName: "",
        error: "ToolCallRequest must be an object",
      };
    }

    const toolName =
      typeof request.name === "string" ? request.name : "";

    if (typeof request.name !== "string" || request.name.trim().length === 0) {
      return {
        ok: false,
        toolName,
        error: "ToolCallRequest.name must be a non-empty string",
      };
    }

    if (
      !request.arguments ||
      typeof request.arguments !== "object" ||
      Array.isArray(request.arguments)
    ) {
      return {
        ok: false,
        toolName,
        error: "ToolCallRequest.arguments must be an object",
      };
    }

    if (
      typeof request.timeoutMs !== "number" ||
      !Number.isInteger(request.timeoutMs) ||
      request.timeoutMs <= 0
    ) {
      return {
        ok: false,
        toolName,
        error: "ToolCallRequest.timeoutMs must be a positive integer",
      };
    }

    return {
      ok: true,
      request: {
        name: request.name,
        arguments: request.arguments,
        timeoutMs: request.timeoutMs,
      },
    };
  }

  private elapsedMs(startedAt: number): number {
    const elapsed = Date.now() - startedAt;
    return elapsed < 0 ? 0 : elapsed;
  }
}
