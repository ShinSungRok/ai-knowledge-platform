import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultToolExecutor } from "./DefaultToolExecutor";
import type { McpToolRegistry } from "../mcp/McpToolRegistry";
import type { McpToolInvokeInput } from "../mcp/McpToolInvokeInput";
import type { McpToolInvokeResult } from "../mcp/McpToolInvokeResult";
import type { McpToolDefinition } from "../mcp/McpToolDefinition";

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

class CountingMcpToolRegistry implements McpToolRegistry {
  public invokeCalls = 0;
  public lastInput: McpToolInvokeInput | null = null;
  public nextResult: McpToolInvokeResult = {
    ok: true,
    toolName: "generate_cited_grounded_answer",
    result: {
      answer: { text: "ok", evidence: [], insufficientEvidence: true },
      citations: [],
    },
  };
  public nextError: Error | null = null;

  async listTools(): Promise<McpToolDefinition[]> {
    return [];
  }

  async invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult> {
    this.invokeCalls += 1;
    this.lastInput = input;
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
    return this.nextResult;
  }
}

function assertDependsOnlyOnMcpToolRegistryPort(): void {
  console.log("[tools] DefaultToolExecutor depends only on the McpToolRegistry port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/tools/DefaultToolExecutor.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "../mcp/McpToolRegistry"'),
    "Executor must import the McpToolRegistry port",
  );
  const forbiddenReferences = [
    "DefaultMcpToolRegistry",
    "GenerateCitedGroundedAnswerMcpTool",
    "InvokeMcpToolUseCase",
    "GenerateCitedGroundedAnswerUseCase",
    "DefaultCitationBuilder",
    "FakeLanguageModelProvider",
    "../application/",
    "../citation/",
    "../rag/",
    "../prompt/",
    "../ai/",
    "../search/",
    "../persistence/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultToolExecutor.ts must not reference "${reference}"`,
    );
  }
}

async function assertInvalidRequestShortCircuits(): Promise<void> {
  console.log("[tools] execute returns invalid_request without calling the registry...");
  const registry = new CountingMcpToolRegistry();
  const executor = new DefaultToolExecutor(registry);

  const cases: Array<{
    request: unknown;
    toolName: string;
    errorSubstring: string;
  }> = [
    {
      request: null,
      toolName: "",
      errorSubstring: "ToolCallRequest must be an object",
    },
    {
      request: { name: " ", arguments: {}, timeoutMs: 100 },
      toolName: " ",
      errorSubstring: "ToolCallRequest.name must be a non-empty string",
    },
    {
      request: { name: "t", arguments: null, timeoutMs: 100 },
      toolName: "t",
      errorSubstring: "ToolCallRequest.arguments must be an object",
    },
    {
      request: { name: "t", arguments: [], timeoutMs: 100 },
      toolName: "t",
      errorSubstring: "ToolCallRequest.arguments must be an object",
    },
    {
      request: { name: "t", arguments: {}, timeoutMs: 0 },
      toolName: "t",
      errorSubstring: "ToolCallRequest.timeoutMs must be a positive integer",
    },
    {
      request: { name: "t", arguments: {}, timeoutMs: 1.5 },
      toolName: "t",
      errorSubstring: "ToolCallRequest.timeoutMs must be a positive integer",
    },
  ];

  for (const testCase of cases) {
    const result = await executor.execute(testCase.request as never);
    assertEqual(result.ok, false, `expected ok=false for ${testCase.errorSubstring}`);
    assertEqual(result.status, "invalid_request", `expected invalid_request for ${testCase.errorSubstring}`);
    assertEqual(result.toolName, testCase.toolName, `expected toolName for ${testCase.errorSubstring}`);
    assertTruthy(
      typeof result.error === "string" && result.error.includes(testCase.errorSubstring),
      `expected error to include "${testCase.errorSubstring}", got: ${result.error}`,
    );
    assertTruthy(
      Number.isInteger(result.durationMs) && result.durationMs >= 0,
      "expected durationMs to be a non-negative integer",
    );
  }

  assertEqual(registry.invokeCalls, 0, "expected the registry to never be called for invalid requests");
}

async function assertSuccessMapping(): Promise<void> {
  console.log("[tools] execute maps ok=true MCP results to status=success...");
  const registry = new CountingMcpToolRegistry();
  const payload = {
    answer: { text: "cited", evidence: [], insufficientEvidence: true },
    citations: [],
  };
  registry.nextResult = {
    ok: true,
    toolName: "generate_cited_grounded_answer",
    result: payload,
  };
  const executor = new DefaultToolExecutor(registry);
  const args = { workspaceId: "ws", query: "q", retrievalLimit: 1, maxCharacters: 100 };

  const result = await executor.execute({
    name: "generate_cited_grounded_answer",
    arguments: args,
    timeoutMs: 1_000,
  });

  assertEqual(registry.invokeCalls, 1, "expected the registry to be called once");
  assertEqual(registry.lastInput?.name, "generate_cited_grounded_answer", "expected name to be delegated");
  assertEqual(registry.lastInput?.arguments, args, "expected arguments to be delegated by reference");
  assertEqual(result.ok, true, "expected ok=true");
  assertEqual(result.status, "success", "expected status=success");
  assertEqual(result.toolName, "generate_cited_grounded_answer", "expected toolName from MCP result");
  assertEqual(result.result, payload, "expected MCP result payload to be returned unchanged");
  assertEqual(result.error, undefined, "expected error to be absent on success");
  assertTruthy(Number.isInteger(result.durationMs) && result.durationMs >= 0, "expected non-negative durationMs");
}

async function assertUnknownToolMapping(): Promise<void> {
  console.log("[tools] execute maps Unknown MCP tool errors to status=unknown_tool...");
  const registry = new CountingMcpToolRegistry();
  registry.nextResult = {
    ok: false,
    toolName: "does_not_exist",
    error: "Unknown MCP tool: does_not_exist",
  };
  const executor = new DefaultToolExecutor(registry);

  const result = await executor.execute({
    name: "does_not_exist",
    arguments: {},
    timeoutMs: 500,
  });

  assertEqual(result.ok, false, "expected ok=false");
  assertEqual(result.status, "unknown_tool", "expected status=unknown_tool");
  assertEqual(result.toolName, "does_not_exist", "expected toolName to echo the MCP result");
  assertEqual(result.error, "Unknown MCP tool: does_not_exist", "expected unknown-tool error message");
}

async function assertFailureMapping(): Promise<void> {
  console.log("[tools] execute maps other ok=false MCP results to status=failure...");
  const registry = new CountingMcpToolRegistry();
  registry.nextResult = {
    ok: false,
    toolName: "generate_cited_grounded_answer",
    error: "workspaceId must be a non-empty string",
  };
  const executor = new DefaultToolExecutor(registry);

  const result = await executor.execute({
    name: "generate_cited_grounded_answer",
    arguments: { workspaceId: " " },
    timeoutMs: 500,
  });

  assertEqual(result.ok, false, "expected ok=false");
  assertEqual(result.status, "failure", "expected status=failure for non-unknown MCP errors");
  assertEqual(result.toolName, "generate_cited_grounded_answer", "expected toolName from MCP result");
  assertEqual(result.error, "workspaceId must be a non-empty string", "expected MCP error message");
}

async function assertRegistryThrowMapping(): Promise<void> {
  console.log("[tools] execute maps a registry throw to status=failure without rethrowing...");
  const registry = new CountingMcpToolRegistry();
  registry.nextError = new Error("registry exploded");
  const executor = new DefaultToolExecutor(registry);

  const result = await executor.execute({
    name: "generate_cited_grounded_answer",
    arguments: {},
    timeoutMs: 500,
  });

  assertEqual(registry.invokeCalls, 1, "expected the registry to still be called once");
  assertEqual(result.ok, false, "expected ok=false");
  assertEqual(result.status, "failure", "expected status=failure when the registry throws");
  assertEqual(result.toolName, "generate_cited_grounded_answer", "expected toolName from the request");
  assertEqual(result.error, "registry exploded", "expected the thrown message");
}

async function main(): Promise<void> {
  assertDependsOnlyOnMcpToolRegistryPort();
  await assertInvalidRequestShortCircuits();
  await assertSuccessMapping();
  await assertUnknownToolMapping();
  await assertFailureMapping();
  await assertRegistryThrowMapping();
  console.log("DefaultToolExecutor validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
