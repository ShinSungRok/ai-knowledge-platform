import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultMcpToolRegistry } from "./DefaultMcpToolRegistry";
import type { McpTool } from "./McpTool";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";
import type { McpToolName } from "./McpToolName";

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

function assertThrows(fn: () => unknown, messageSubstring: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected throw containing: ${messageSubstring}`);
}

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected async throw containing: ${messageSubstring}`);
}

class FakeNamedMcpTool implements McpTool {
  public invokeCalls = 0;
  public lastArgs: Record<string, unknown> | null = null;

  constructor(
    name: string,
    private readonly invokeResult: McpToolInvokeResult,
  ) {
    this.definition = {
      name: name as McpToolName,
      description: `fake ${name}`,
      inputKeys: ["workspaceId"] as const,
    };
  }

  readonly definition: McpToolDefinition;

  async invoke(args: Record<string, unknown>): Promise<McpToolInvokeResult> {
    this.invokeCalls += 1;
    this.lastArgs = args;
    return this.invokeResult;
  }
}

function assertDependsOnlyOnMcpToolPort(): void {
  console.log("[mcp] DefaultMcpToolRegistry imports only McpTool ports, never a concrete tool adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/mcp/DefaultMcpToolRegistry.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "GenerateCitedGroundedAnswerMcpTool",
    "GenerateCitedGroundedAnswerUseCase",
    "DefaultCitationBuilder",
    "DefaultGroundedAnswerAssembler",
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
      `DefaultMcpToolRegistry.ts must not reference "${reference}"`,
    );
  }
}

async function assertListToolsReturnsNameAscendingOrder(): Promise<void> {
  console.log("[mcp] listTools returns registered definitions in name-ascending order...");
  const zebra = new FakeNamedMcpTool("zebra_tool", {
    ok: true,
    toolName: "zebra_tool",
  });
  const alpha = new FakeNamedMcpTool("alpha_tool", {
    ok: true,
    toolName: "alpha_tool",
  });
  const middle = new FakeNamedMcpTool("middle_tool", {
    ok: true,
    toolName: "middle_tool",
  });
  const registry = new DefaultMcpToolRegistry([zebra, alpha, middle]);

  const listed = await registry.listTools();
  assertEqual(
    listed.map((d) => d.name).join(","),
    "alpha_tool,middle_tool,zebra_tool",
    "expected listTools to sort definitions by name ascending",
  );
}

function assertRejectsDuplicateToolNames(): void {
  console.log("[mcp] constructor rejects duplicate tool names...");
  const first = new FakeNamedMcpTool("generate_cited_grounded_answer", {
    ok: true,
    toolName: "generate_cited_grounded_answer",
  });
  const second = new FakeNamedMcpTool("generate_cited_grounded_answer", {
    ok: true,
    toolName: "generate_cited_grounded_answer",
  });
  assertThrows(
    () => new DefaultMcpToolRegistry([first, second]),
    "Duplicate MCP tool name: generate_cited_grounded_answer",
  );
}

async function assertKnownToolDelegation(): Promise<void> {
  console.log("[mcp] invoke delegates arguments unchanged to a known registered tool...");
  const tool = new FakeNamedMcpTool("generate_cited_grounded_answer", {
    ok: true,
    toolName: "generate_cited_grounded_answer",
    result: {
      answer: { text: "ok", evidence: [], insufficientEvidence: true },
      citations: [],
    },
  });
  const registry = new DefaultMcpToolRegistry([tool]);
  const args = { workspaceId: "ws", query: "q", retrievalLimit: 1, maxCharacters: 100 };

  const result = await registry.invoke({
    name: "generate_cited_grounded_answer",
    arguments: args,
  });

  assertEqual(tool.invokeCalls, 1, "expected the registered tool to be invoked exactly once");
  assertEqual(tool.lastArgs, args, "expected arguments to be delegated by reference unchanged");
  assertEqual(result.ok, true, "expected the tool's own ok=true result to be returned");
  assertEqual(result.toolName, "generate_cited_grounded_answer", "expected the tool's own toolName to be returned");
  assertEqual(result.result?.answer.text, "ok", "expected the tool's own result payload to be returned");
}

async function assertUnknownToolError(): Promise<void> {
  console.log("[mcp] invoke returns ok=false for an unknown tool name without throwing...");
  const tool = new FakeNamedMcpTool("generate_cited_grounded_answer", {
    ok: true,
    toolName: "generate_cited_grounded_answer",
  });
  const registry = new DefaultMcpToolRegistry([tool]);

  const result = await registry.invoke({
    name: "does_not_exist",
    arguments: {},
  });

  assertEqual(tool.invokeCalls, 0, "expected no registered tool to be invoked for an unknown name");
  assertEqual(result.ok, false, "expected ok=false for an unknown tool");
  assertEqual(result.toolName, "does_not_exist", "expected toolName to echo the requested unknown name");
  assertEqual(result.error, "Unknown MCP tool: does_not_exist", "expected the fixed unknown-tool error message");
  assertEqual(result.result, undefined, "expected result to be absent for an unknown tool");
}

async function assertRejectsInvalidRegistryInput(): Promise<void> {
  console.log("[mcp] invoke rejects an invalid McpToolInvokeInput...");
  const tool = new FakeNamedMcpTool("generate_cited_grounded_answer", {
    ok: true,
    toolName: "generate_cited_grounded_answer",
  });
  const registry = new DefaultMcpToolRegistry([tool]);

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => registry.invoke(null),
    "McpToolInvokeInput must be an object",
  );
  await assertThrowsAsync(
    () => registry.invoke({ name: " ", arguments: {} }),
    "McpToolInvokeInput.name must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => registry.invoke({ name: "generate_cited_grounded_answer", arguments: null }),
    "McpToolInvokeInput.arguments must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => registry.invoke({ name: "generate_cited_grounded_answer", arguments: [] }),
    "McpToolInvokeInput.arguments must be an object",
  );
  assertEqual(tool.invokeCalls, 0, "expected no tool invoke for invalid registry input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnMcpToolPort();
  await assertListToolsReturnsNameAscendingOrder();
  assertRejectsDuplicateToolNames();
  await assertKnownToolDelegation();
  await assertUnknownToolError();
  await assertRejectsInvalidRegistryInput();
  console.log("DefaultMcpToolRegistry validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
