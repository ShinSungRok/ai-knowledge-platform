import type { ToolCallRequest } from "./ToolCallRequest";
import type { ToolCallResult } from "./ToolCallResult";

/**
 * Port for executing a single transport-independent tool call.
 *
 * Accepts a {@link ToolCallRequest} and returns a structured
 * {@link ToolCallResult} without throwing for expected validation,
 * unknown-tool, timeout, or backend failures. Concrete adapters live
 * under `app/knowledge/tools` and are wired only at the composition
 * root; no adapter may import an MCP SDK, open a network socket, or
 * duplicate Domain/RAG business logic — it only orchestrates an
 * existing capability-exposure boundary (e.g. an MCP tool registry).
 */
export interface ToolExecutor {
  execute(request: ToolCallRequest): Promise<ToolCallResult>;
}
