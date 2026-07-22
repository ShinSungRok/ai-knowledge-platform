/**
 * Session options for newline-delimited MCP JSON-RPC over stdio.
 */
export type McpStdioSessionConfig = {
  /** Maximum accepted request line size in bytes (UTF-8). Default: 1_048_576. */
  maxLineBytes?: number;
  /** When true, blank lines are skipped. Default: true. */
  ignoreEmptyLines?: boolean;
};

export const DEFAULT_MCP_STDIO_MAX_LINE_BYTES = 1_048_576;
export const DEFAULT_MCP_STDIO_IGNORE_EMPTY_LINES = true;

export function resolveMcpStdioSessionConfig(
  config?: McpStdioSessionConfig,
): {
  maxLineBytes: number;
  ignoreEmptyLines: boolean;
} {
  return {
    maxLineBytes:
      config?.maxLineBytes !== undefined
        ? config.maxLineBytes
        : DEFAULT_MCP_STDIO_MAX_LINE_BYTES,
    ignoreEmptyLines:
      config?.ignoreEmptyLines !== undefined
        ? config.ignoreEmptyLines
        : DEFAULT_MCP_STDIO_IGNORE_EMPTY_LINES,
  };
}
