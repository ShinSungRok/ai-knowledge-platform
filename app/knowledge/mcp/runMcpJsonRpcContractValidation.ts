import { KNOWLEDGE_MODULE_MCP } from "./index";
import type { McpJsonRpcHandler } from "./McpJsonRpcHandler";
import type { McpJsonRpcRequest } from "./McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "./McpJsonRpcResponse";
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

class FakeMcpJsonRpcHandler implements McpJsonRpcHandler {
  async handle(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    if (request.method === MCP_METHOD_TOOLS_LIST) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { tools: [] },
      };
    }
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Method not found" },
    };
  }
}

function assertModuleConstant(): void {
  console.log("[mcp] KNOWLEDGE_MODULE_MCP constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_MCP, "app/knowledge/mcp", "module constant");
}

function assertMethodConstants(): void {
  console.log("[mcp] MCP method name constants are stable...");
  assertEqual(MCP_METHOD_TOOLS_LIST, "tools/list", "tools/list");
  assertEqual(MCP_METHOD_TOOLS_CALL, "tools/call", "tools/call");
}

async function assertHandlerPortContract(): Promise<void> {
  console.log("[mcp] McpJsonRpcHandler port is implementable with Fake handler...");
  const handler: McpJsonRpcHandler = new FakeMcpJsonRpcHandler();
  const request: McpJsonRpcRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: MCP_METHOD_TOOLS_LIST,
  };
  const response = await handler.handle(request);
  assertEqual(response.jsonrpc, "2.0", "jsonrpc");
  assertEqual(response.id, 1, "id");
  assertTruthy(response.result !== undefined, "result present");
  assertTruthy(response.error === undefined, "no error");

  const unknown = await handler.handle({
    jsonrpc: "2.0",
    id: "abc",
    method: "unknown/method",
  });
  assertEqual(unknown.error?.code, -32601, "method not found");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertMethodConstants();
  await assertHandlerPortContract();
  console.log("McpJsonRpc contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
