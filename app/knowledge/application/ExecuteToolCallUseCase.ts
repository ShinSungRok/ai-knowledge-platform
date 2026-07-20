import type { ToolExecutor } from "../tools/ToolExecutor";
import type { ToolCallResult } from "../tools/ToolCallResult";

/**
 * Input for executing a single tool call from the application
 * boundary. Kept separate from {@link ToolCallRequest} so this use
 * case owns its own validation contract rather than reusing the tools
 * module's port input type directly.
 */
export interface ExecuteToolCallInput {
  name: string;
  arguments: Record<string, unknown>;
  timeoutMs: number;
}

/**
 * Execute-tool-call use case: validate a tool name, argument bag, and
 * timeout budget at the application boundary, then delegate to a
 * {@link ToolExecutor} port and return its {@link ToolCallResult}
 * unchanged.
 *
 * Depends only on the executor port — never on a concrete tools/mcp
 * adapter, MCP SDK, or network transport. Does not interpret tool
 * results or duplicate Domain/RAG business logic. Invalid input throws
 * at this boundary (and never calls the executor); structured
 * invalid_request/unknown_tool/timeout/failure statuses from the
 * executor remain non-throwing ToolCallResult values.
 */
export class ExecuteToolCallUseCase {
  constructor(private readonly toolExecutor: ToolExecutor) {}

  async execute(input: ExecuteToolCallInput): Promise<ToolCallResult> {
    const validated = this.toInput(input);

    return this.toolExecutor.execute({
      name: validated.name,
      arguments: validated.arguments,
      timeoutMs: validated.timeoutMs,
    });
  }

  private toInput(input: ExecuteToolCallInput): ExecuteToolCallInput {
    if (!input || typeof input !== "object") {
      throw new Error("ExecuteToolCallInput must be an object");
    }
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      throw new Error("ExecuteToolCallInput.name must be a non-empty string");
    }
    if (
      !input.arguments ||
      typeof input.arguments !== "object" ||
      Array.isArray(input.arguments)
    ) {
      throw new Error("ExecuteToolCallInput.arguments must be an object");
    }
    if (
      typeof input.timeoutMs !== "number" ||
      !Number.isInteger(input.timeoutMs) ||
      input.timeoutMs <= 0
    ) {
      throw new Error(
        "ExecuteToolCallInput.timeoutMs must be a positive integer",
      );
    }
    return {
      name: input.name,
      arguments: input.arguments,
      timeoutMs: input.timeoutMs,
    };
  }
}
