/**
 * Writes one newline-terminated line to an MCP stdio transport.
 * Implementations must append the trailing newline themselves (or treat
 * `line` as the payload without a trailing newline and add it).
 */
export interface McpStdioLineWriter {
  writeLine(line: string): Promise<void>;
}
