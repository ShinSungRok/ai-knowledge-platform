import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import { DefaultMcpJsonRpcHandler } from "./DefaultMcpJsonRpcHandler";
import { FakeMcpStdioLineReader } from "./FakeMcpStdioLineReader";
import { FakeMcpStdioLineWriter } from "./FakeMcpStdioLineWriter";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeInput } from "./McpToolInvokeInput";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";
import type { McpToolRegistry } from "./McpToolRegistry";
import {
  MCP_METHOD_TOOLS_CALL,
  MCP_METHOD_TOOLS_LIST,
} from "./McpJsonRpcMethods";
import { StdioMcpJsonRpcSession } from "./StdioMcpJsonRpcSession";

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

class FakeRegistry implements McpToolRegistry {
  constructor(
    private readonly tools: McpToolDefinition[],
    private readonly invokeImpl?: (
      input: McpToolInvokeInput,
    ) => Promise<McpToolInvokeResult>,
  ) {}

  async listTools(): Promise<McpToolDefinition[]> {
    return [...this.tools];
  }

  async invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult> {
    if (this.invokeImpl) {
      return this.invokeImpl(input);
    }
    return { ok: false, toolName: input.name, error: "not implemented" };
  }
}

const SAMPLE_TOOL: McpToolDefinition = {
  name: "generate_cited_grounded_answer",
  description: "Generate a cited grounded answer",
  inputKeys: ["workspaceId", "query"],
};

function parseLine(line: string): {
  jsonrpc: string;
  id: unknown;
  result?: unknown;
  error?: { code: number; message: string };
} {
  return JSON.parse(line) as {
    jsonrpc: string;
    id: unknown;
    result?: unknown;
    error?: { code: number; message: string };
  };
}

async function assertToolsList(): Promise<void> {
  console.log("[mcp] Stdio session tools/list returns tools array...");
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: MCP_METHOD_TOOLS_LIST,
    }),
    null,
  ]);
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(new FakeRegistry([SAMPLE_TOOL])),
    reader,
    writer,
  );
  await session.run();
  assertEqual(writer.lines.length, 1, "one response line");
  const response = parseLine(writer.lines[0]!);
  assertEqual(response.id, 1, "id");
  const result = response.result as { tools: unknown[] };
  assertTruthy(Array.isArray(result.tools), "tools array");
  assertEqual(result.tools.length, 1, "one tool");
}

async function assertToolsCallSuccessAndFailure(): Promise<void> {
  console.log("[mcp] Stdio session tools/call success and isError paths...");
  const answer: CitedGroundedAnswer = {
    answer: {
      text: "ok",
      insufficientEvidence: false,
      evidence: [],
    },
    citations: [],
  };
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: MCP_METHOD_TOOLS_CALL,
      params: {
        name: SAMPLE_TOOL.name,
        arguments: { workspaceId: "ws", query: "q" },
      },
    }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: MCP_METHOD_TOOLS_CALL,
      params: {
        name: SAMPLE_TOOL.name,
        arguments: { workspaceId: "ws", query: "fail" },
      },
    }),
    null,
  ]);
  let call = 0;
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(
      new FakeRegistry([SAMPLE_TOOL], async () => {
        call += 1;
        if (call === 1) {
          return { ok: true, toolName: SAMPLE_TOOL.name, result: answer };
        }
        return {
          ok: false,
          toolName: SAMPLE_TOOL.name,
          error: "tool failed",
        };
      }),
    ),
    reader,
    writer,
  );
  await session.run();
  assertEqual(writer.lines.length, 2, "two responses");
  const ok = parseLine(writer.lines[0]!);
  const fail = parseLine(writer.lines[1]!);
  const okResult = ok.result as { isError: boolean };
  const failResult = fail.result as { isError: boolean; content: Array<{ text: string }> };
  assertEqual(okResult.isError, false, "success isError");
  assertEqual(failResult.isError, true, "failure isError");
  assertTruthy(
    failResult.content[0]!.text.includes("tool failed"),
    "failure text",
  );
}

async function assertParseError(): Promise<void> {
  console.log("[mcp] Stdio session invalid JSON → -32700...");
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader(["{not-json", null]);
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(new FakeRegistry([])),
    reader,
    writer,
  );
  await session.run();
  assertEqual(writer.lines.length, 1, "one error line");
  const response = parseLine(writer.lines[0]!);
  assertEqual(response.id, null, "id null");
  assertEqual(response.error?.code, -32700, "parse error code");
  assertEqual(response.error?.message, "Parse error", "parse message");
}

async function assertUnknownMethod(): Promise<void> {
  console.log("[mcp] Stdio session unknown method → -32601...");
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/unknown",
    }),
    null,
  ]);
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(new FakeRegistry([])),
    reader,
    writer,
  );
  await session.run();
  const response = parseLine(writer.lines[0]!);
  assertEqual(response.error?.code, -32601, "method not found");
}

async function assertEofEndsCleanly(): Promise<void> {
  console.log("[mcp] Stdio session EOF ends run() cleanly...");
  const writer = new FakeMcpStdioLineWriter();
  const reader = new FakeMcpStdioLineReader([null]);
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(new FakeRegistry([])),
    reader,
    writer,
  );
  await session.run();
  assertEqual(writer.lines.length, 0, "no writes on immediate EOF");
}

async function assertOversizedAndNotification(): Promise<void> {
  console.log(
    "[mcp] Stdio session oversized line and notification → errors, continue...",
  );
  const writer = new FakeMcpStdioLineWriter();
  const big = "x".repeat(200);
  const reader = new FakeMcpStdioLineReader([
    big,
    JSON.stringify({ jsonrpc: "2.0", method: MCP_METHOD_TOOLS_LIST }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 10,
      method: MCP_METHOD_TOOLS_LIST,
    }),
    null,
  ]);
  const session = new StdioMcpJsonRpcSession(
    new DefaultMcpJsonRpcHandler(new FakeRegistry([SAMPLE_TOOL])),
    reader,
    writer,
    { maxLineBytes: 50 },
  );
  await session.run();
  assertEqual(writer.lines.length, 3, "three responses");
  assertEqual(parseLine(writer.lines[0]!).error?.code, -32700, "oversized");
  assertEqual(parseLine(writer.lines[1]!).error?.code, -32600, "notification");
  assertEqual(parseLine(writer.lines[2]!).id, 10, "valid after errors");
}

async function main(): Promise<void> {
  await assertToolsList();
  await assertToolsCallSuccessAndFailure();
  await assertParseError();
  await assertUnknownMethod();
  await assertEofEndsCleanly();
  await assertOversizedAndNotification();
  console.log("StdioMcpJsonRpcSession validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
