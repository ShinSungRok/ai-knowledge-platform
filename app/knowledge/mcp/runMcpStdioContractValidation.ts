import { KNOWLEDGE_MODULE_MCP } from "./index";
import type { McpStdioLineReader } from "./McpStdioLineReader";
import type { McpStdioLineWriter } from "./McpStdioLineWriter";
import {
  DEFAULT_MCP_STDIO_IGNORE_EMPTY_LINES,
  DEFAULT_MCP_STDIO_MAX_LINE_BYTES,
  resolveMcpStdioSessionConfig,
  type McpStdioSessionConfig,
} from "./McpStdioSessionConfig";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

class FakeMcpStdioLineReader implements McpStdioLineReader {
  constructor(private readonly lines: Array<string | null>) {}

  async readLine(): Promise<string | null> {
    if (this.lines.length === 0) {
      return null;
    }
    return this.lines.shift() ?? null;
  }
}

class FakeMcpStdioLineWriter implements McpStdioLineWriter {
  readonly lines: string[] = [];

  async writeLine(line: string): Promise<void> {
    this.lines.push(line);
  }
}

function assertModuleConstant(): void {
  console.log("[mcp] KNOWLEDGE_MODULE_MCP constant is exported...");
  assertEqual(KNOWLEDGE_MODULE_MCP, "app/knowledge/mcp", "module constant");
}

async function assertReaderWriterPorts(): Promise<void> {
  console.log("[mcp] Fake stdio reader/writer ports work...");
  const reader: McpStdioLineReader = new FakeMcpStdioLineReader([
    '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
    null,
  ]);
  const writer: McpStdioLineWriter = new FakeMcpStdioLineWriter();

  const first = await reader.readLine();
  assertTruthy(first !== null, "first line");
  assertTruthy(first!.includes("tools/list"), "line content");
  await writer.writeLine('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
  assertEqual((writer as FakeMcpStdioLineWriter).lines.length, 1, "wrote one");
  assertEqual(await reader.readLine(), null, "EOF");
}

function assertConfigDefaults(): void {
  console.log("[mcp] McpStdioSessionConfig defaults resolve...");
  const config: McpStdioSessionConfig = {};
  const resolved = resolveMcpStdioSessionConfig(config);
  assertEqual(
    resolved.maxLineBytes,
    DEFAULT_MCP_STDIO_MAX_LINE_BYTES,
    "maxLineBytes default",
  );
  assertEqual(
    resolved.ignoreEmptyLines,
    DEFAULT_MCP_STDIO_IGNORE_EMPTY_LINES,
    "ignoreEmptyLines default",
  );

  const custom = resolveMcpStdioSessionConfig({
    maxLineBytes: 100,
    ignoreEmptyLines: false,
  });
  assertEqual(custom.maxLineBytes, 100, "custom max");
  assertEqual(custom.ignoreEmptyLines, false, "custom ignore");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertReaderWriterPorts();
  assertConfigDefaults();
  console.log("MCP stdio contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
