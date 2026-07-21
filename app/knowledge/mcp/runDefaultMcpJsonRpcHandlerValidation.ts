import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import { DefaultMcpJsonRpcHandler } from "./DefaultMcpJsonRpcHandler";
import type { McpToolDefinition } from "./McpToolDefinition";
import type { McpToolInvokeInput } from "./McpToolInvokeInput";
import type { McpToolInvokeResult } from "./McpToolInvokeResult";
import type { McpToolRegistry } from "./McpToolRegistry";
import {
  MCP_METHOD_TOOLS_CALL,
  MCP_METHOD_TOOLS_LIST,
} from "./McpJsonRpcMethods";

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

async function assertToolsList(): Promise<void> {
  console.log("[mcp] DefaultMcpJsonRpcHandler tools/list returns schema...");
  const handler = new DefaultMcpJsonRpcHandler(
    new FakeRegistry([SAMPLE_TOOL]),
  );
  const response = await handler.handle({
    jsonrpc: "2.0",
    id: 1,
    method: MCP_METHOD_TOOLS_LIST,
  });
  assertEqual(response.error, undefined, "no error");
  const result = response.result as {
    tools: Array<{
      name: string;
      description: string;
      inputSchema: {
        type: string;
        properties: Record<string, { type: string }>;
        required: string[];
      };
    }>;
  };
  assertEqual(result.tools.length, 1, "one tool");
  assertEqual(result.tools[0]!.name, SAMPLE_TOOL.name, "name");
  assertEqual(result.tools[0]!.inputSchema.type, "object", "schema type");
  assertEqual(
    result.tools[0]!.inputSchema.required.join(","),
    "workspaceId,query",
    "required",
  );
  assertEqual(
    result.tools[0]!.inputSchema.properties["workspaceId"]!.type,
    "string",
    "property type",
  );
}

async function assertToolsCallSuccess(): Promise<void> {
  console.log("[mcp] DefaultMcpJsonRpcHandler tools/call success path...");
  const answer: CitedGroundedAnswer = {
    answer: {
      text: "ok",
      insufficientEvidence: false,
      evidence: [],
    },
    citations: [],
  };
  const handler = new DefaultMcpJsonRpcHandler(
    new FakeRegistry([SAMPLE_TOOL], async (input) => ({
      ok: true,
      toolName: input.name,
      result: answer,
    })),
  );
  const response = await handler.handle({
    jsonrpc: "2.0",
    id: "call-1",
    method: MCP_METHOD_TOOLS_CALL,
    params: {
      name: "generate_cited_grounded_answer",
      arguments: { workspaceId: "w", query: "q" },
    },
  });
  assertEqual(response.error, undefined, "no json-rpc error");
  const result = response.result as {
    content: Array<{ type: string; text: string }>;
    isError: boolean;
  };
  assertEqual(result.isError, false, "isError");
  assertTruthy(result.content[0]!.text.includes('"text":"ok"'), "content");
}

async function assertToolsCallFailureAsResult(): Promise<void> {
  console.log(
    "[mcp] DefaultMcpJsonRpcHandler tools/call tool failure uses result.isError...",
  );
  const handler = new DefaultMcpJsonRpcHandler(
    new FakeRegistry([SAMPLE_TOOL], async (input) => ({
      ok: false,
      toolName: input.name,
      error: "boom",
    })),
  );
  const response = await handler.handle({
    jsonrpc: "2.0",
    id: 2,
    method: MCP_METHOD_TOOLS_CALL,
    params: {
      name: "generate_cited_grounded_answer",
      arguments: { workspaceId: "w", query: "q" },
    },
  });
  assertEqual(response.error, undefined, "no json-rpc error");
  const result = response.result as { isError: boolean; content: Array<{ text: string }> };
  assertEqual(result.isError, true, "isError");
  assertEqual(result.content[0]!.text, "boom", "error text");
}

async function assertInvalidAndUnknown(): Promise<void> {
  console.log("[mcp] DefaultMcpJsonRpcHandler maps invalid/unknown methods...");
  const handler = new DefaultMcpJsonRpcHandler(new FakeRegistry([]));

  const invalid = await handler.handle({
    jsonrpc: "1.0" as "2.0",
    id: 1,
    method: MCP_METHOD_TOOLS_LIST,
  });
  assertEqual(invalid.error?.code, -32600, "invalid request");

  const unknown = await handler.handle({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/unknown",
  });
  assertEqual(unknown.error?.code, -32601, "method not found");

  const badParams = await handler.handle({
    jsonrpc: "2.0",
    id: 1,
    method: MCP_METHOD_TOOLS_CALL,
    params: { name: 123 },
  });
  assertEqual(badParams.error?.code, -32602, "invalid params");
}

async function assertInternalError(): Promise<void> {
  console.log("[mcp] DefaultMcpJsonRpcHandler maps registry throw to -32603...");
  const throwing: McpToolRegistry = {
    async listTools() {
      throw new Error("registry down");
    },
    async invoke() {
      throw new Error("registry down");
    },
  };
  const handler = new DefaultMcpJsonRpcHandler(throwing);
  const response = await handler.handle({
    jsonrpc: "2.0",
    id: 9,
    method: MCP_METHOD_TOOLS_LIST,
  });
  assertEqual(response.error?.code, -32603, "internal error");
}

async function main(): Promise<void> {
  await assertToolsList();
  await assertToolsCallSuccess();
  await assertToolsCallFailureAsResult();
  await assertInvalidAndUnknown();
  await assertInternalError();
  console.log("DefaultMcpJsonRpcHandler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
