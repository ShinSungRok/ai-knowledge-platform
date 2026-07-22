import type { McpStdioLineWriter } from "./McpStdioLineWriter";

/**
 * Capturing Fake {@link McpStdioLineWriter} for dependency-free validation.
 */
export class FakeMcpStdioLineWriter implements McpStdioLineWriter {
  readonly lines: string[] = [];

  async writeLine(line: string): Promise<void> {
    this.lines.push(line);
  }
}
