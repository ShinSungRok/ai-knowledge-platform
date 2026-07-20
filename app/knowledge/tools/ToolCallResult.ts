import type { ToolCallStatus } from "./ToolCallStatus";

/**
 * Structured result of a single tool call: either a successful payload
 * (`ok: true`, `status: "success"`, `result` set) or a non-throwing
 * failure (`ok: false`, a non-success {@link ToolCallStatus}, `error`
 * set). `durationMs` is always a non-negative integer measuring wall
 * time for the attempt. Tool executors must never throw across this
 * boundary for expected validation, unknown-tool, timeout, or backend
 * failures — they convert those into `ok: false` results.
 */
export interface ToolCallResult {
  ok: boolean;
  status: ToolCallStatus;
  toolName: string;
  result?: unknown;
  error?: string;
  durationMs: number;
}
