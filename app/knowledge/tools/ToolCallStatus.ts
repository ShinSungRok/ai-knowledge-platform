/**
 * Outcome status of a single tool call attempt.
 *
 * Distinguishes success from invalid request shape, unknown tool name,
 * timed-out execution, and other failures — so callers can branch on
 * structured status without inspecting free-form error strings alone.
 */
export type ToolCallStatus =
  | "success"
  | "invalid_request"
  | "unknown_tool"
  | "timeout"
  | "failure";
