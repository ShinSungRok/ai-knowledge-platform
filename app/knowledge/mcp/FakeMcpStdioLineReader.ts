import type { McpStdioLineReader } from "./McpStdioLineReader";

/**
 * Queued Fake {@link McpStdioLineReader} for dependency-free validation.
 * After the queue is exhausted, `readLine` returns `null` (EOF).
 */
export class FakeMcpStdioLineReader implements McpStdioLineReader {
  private readonly queue: Array<string | null>;

  constructor(lines: readonly (string | null)[]) {
    this.queue = [...lines];
  }

  async readLine(): Promise<string | null> {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue.shift() ?? null;
  }
}
