/**
 * Module: `app/knowledge/tools`
 *
 * Transport-independent Tool Calling boundary (request / result /
 * executor) sitting above MCP capability exposure.
 *
 * `ToolCallStatus`, `ToolCallRequest`, `ToolCallResult`, and the
 * `ToolExecutor` port (Task 54) define how a validated tool call —
 * including timeout and failure statuses — can be expressed without
 * Domain/RAG business-logic duplication and without an MCP SDK,
 * network transport, or Agent orchestrator. `DefaultToolExecutor`
 * (Task 55) injects only `McpToolRegistry` and maps MCP invoke results
 * onto ToolCall statuses (timeout enforcement is a later task).
 */
export const KNOWLEDGE_MODULE_TOOLS = "app/knowledge/tools" as const;

export type { ToolCallStatus } from "./ToolCallStatus";
export type { ToolCallRequest } from "./ToolCallRequest";
export type { ToolCallResult } from "./ToolCallResult";
export type { ToolExecutor } from "./ToolExecutor";
export { DefaultToolExecutor } from "./DefaultToolExecutor";
