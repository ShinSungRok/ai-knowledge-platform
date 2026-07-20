import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { McpToolName } from "./McpToolName";

/**
 * Structured result of a single MCP tool invoke: either a successful
 * evidence-bound {@link CitedGroundedAnswer} (`ok: true`, `result` set)
 * or a non-throwing failure (`ok: false`, `error` set). Tool adapters
 * must never throw across this boundary for expected validation or
 * use-case failures — they convert those into `ok: false` results.
 */
export interface McpToolInvokeResult {
  ok: boolean;
  toolName: McpToolName;
  result?: CitedGroundedAnswer;
  error?: string;
}
