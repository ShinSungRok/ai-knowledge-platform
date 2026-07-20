import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";

/**
 * Structured result of a single MCP tool invoke: either a successful
 * evidence-bound {@link CitedGroundedAnswer} (`ok: true`, `result` set)
 * or a non-throwing failure (`ok: false`, `error` set). `toolName` is a
 * plain `string` so unknown-tool registry results can echo the
 * requested name without normalizing it to a known
 * {@link McpToolName}. Tool adapters and registries must never throw
 * across this boundary for expected validation, unknown-tool, or
 * use-case failures — they convert those into `ok: false` results.
 */
export interface McpToolInvokeResult {
  ok: boolean;
  toolName: string;
  result?: CitedGroundedAnswer;
  error?: string;
}
