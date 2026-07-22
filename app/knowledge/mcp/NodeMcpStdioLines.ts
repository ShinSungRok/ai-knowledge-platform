import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { McpStdioLineReader } from "./McpStdioLineReader";
import type { McpStdioLineWriter } from "./McpStdioLineWriter";

/**
 * {@link McpStdioLineReader} over a Node {@link Readable} (e.g. process.stdin).
 * Not used by default `pnpm validate` (Fake streams only).
 */
export class NodeMcpStdioLineReader implements McpStdioLineReader {
  private readonly iterator: AsyncIterator<string>;
  private done = false;

  constructor(stream: Readable) {
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    this.iterator = rl[Symbol.asyncIterator]();
  }

  async readLine(): Promise<string | null> {
    if (this.done) {
      return null;
    }
    const next = await this.iterator.next();
    if (next.done) {
      this.done = true;
      return null;
    }
    return next.value;
  }
}

/**
 * {@link McpStdioLineWriter} over a Node {@link Writable} (e.g. process.stdout).
 * Appends a trailing newline. Not used by default `pnpm validate`.
 */
export class NodeMcpStdioLineWriter implements McpStdioLineWriter {
  constructor(private readonly stream: Writable) {}

  async writeLine(line: string): Promise<void> {
    const payload = `${line}\n`;
    await new Promise<void>((resolve, reject) => {
      this.stream.write(payload, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
