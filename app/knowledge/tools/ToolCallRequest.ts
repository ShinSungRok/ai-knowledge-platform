/**
 * Input for a single transport-independent tool call: the tool name,
 * a free-form argument bag, and a positive timeout budget in
 * milliseconds. Argument shape validation and timeout enforcement
 * belong to the {@link ToolExecutor} adapter, not this contract type.
 */
export interface ToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
  timeoutMs: number;
}
