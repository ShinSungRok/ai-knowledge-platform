import { createInMemoryStdioMcpSession } from "./createInMemoryStdioMcpSession";
import { FakeMcpStdioLineReader } from "../mcp/FakeMcpStdioLineReader";
import { FakeMcpStdioLineWriter } from "../mcp/FakeMcpStdioLineWriter";
import { MCP_METHOD_TOOLS_LIST } from "../mcp/McpJsonRpcMethods";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

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

async function main(): Promise<void> {
  console.log(
    "[composition] KNOWLEDGE_MODULE_COMPOSITION constant is exported...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_COMPOSITION,
    "app/knowledge/composition",
    "module constant",
  );

  console.log(
    "[composition] createInMemoryStdioMcpSession tools/list via Fake streams...",
  );
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: MCP_METHOD_TOOLS_LIST,
    }),
    null,
  ]);
  const { run } = createInMemoryStdioMcpSession(reader, writer);
  await run();
  assertEqual(writer.lines.length, 1, "one response");
  const body = JSON.parse(writer.lines[0]!) as {
    result?: { tools?: unknown[] };
    error?: unknown;
  };
  assertEqual(body.error, undefined, "no error");
  assertTruthy(Array.isArray(body.result?.tools), "tools array");
  assertTruthy((body.result!.tools as unknown[]).length >= 1, "has tools");
  console.log("createInMemoryStdioMcpSession validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
