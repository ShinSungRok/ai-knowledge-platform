/**
 * Reads one newline-delimited line from an MCP stdio transport.
 * Returns `null` at EOF.
 */
export interface McpStdioLineReader {
  readLine(): Promise<string | null>;
}
