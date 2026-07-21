import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import { DefaultMcpJsonRpcHandler } from "../mcp/DefaultMcpJsonRpcHandler";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { McpJsonRpcRequest } from "../mcp/McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "../mcp/McpJsonRpcResponse";
import type { McpToolDefinition } from "../mcp/McpToolDefinition";
import type { McpToolInvokeInput } from "../mcp/McpToolInvokeInput";
import type { McpToolInvokeResult } from "../mcp/McpToolInvokeResult";
import type { McpToolRegistry } from "../mcp/McpToolRegistry";
import {
  MCP_METHOD_TOOLS_CALL,
  MCP_METHOD_TOOLS_LIST,
} from "../mcp/McpJsonRpcMethods";
import { McpJsonRpcController } from "./McpJsonRpcController";

const WORKSPACE_A = "workspace-a";
const API_KEY = "mcp-test-key";

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

class RecordingHandler implements McpJsonRpcHandler {
  lastRequest: McpJsonRpcRequest | undefined;

  async handle(request: McpJsonRpcRequest): Promise<McpJsonRpcResponse> {
    this.lastRequest = request;
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
      result: {
        content: [{ type: "text", text: "ok" }],
        isError: false,
      },
    };
  }
}

class FakeRegistry implements McpToolRegistry {
  async listTools(): Promise<McpToolDefinition[]> {
    return [
      {
        name: "generate_cited_grounded_answer",
        description: "d",
        inputKeys: ["workspaceId", "query"],
      },
    ];
  }

  async invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult> {
    return {
      ok: true,
      toolName: input.name,
      result: {
        answer: { text: "a", insufficientEvidence: false, evidence: [] },
        citations: [],
      },
    };
  }
}

function buildController(
  handler: McpJsonRpcHandler = new RecordingHandler(),
): {
  controller: McpJsonRpcController;
  handler: McpJsonRpcHandler;
} {
  const authenticator = new ApiKeyAuthenticator({
    [API_KEY]: { subject: "user", workspaceId: WORKSPACE_A },
    "other-key": { subject: "other", workspaceId: "other-workspace" },
  });
  const bearerGuard = new HttpBearerGuard(authenticator);
  const authorizer = new DefaultWorkspaceAuthorizer();
  return {
    controller: new McpJsonRpcController(handler, bearerGuard, authorizer),
    handler,
  };
}

function bearerHeaders(
  token: string = API_KEY,
): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function assertUnauthorized(): Promise<void> {
  console.log("[api] McpJsonRpcController returns 401 without Bearer...");
  const { controller } = buildController();
  const response = await controller.handle({
    method: "POST",
    path: "/mcp",
    headers: {},
    body: { jsonrpc: "2.0", id: 1, method: MCP_METHOD_TOOLS_LIST },
  });
  assertEqual(response.status, 401, "status");
}

async function assertMethodNotAllowed(): Promise<void> {
  console.log("[api] McpJsonRpcController returns 405 for non-POST...");
  const { controller } = buildController();
  const response = await controller.handle({
    method: "GET",
    path: "/mcp",
    headers: bearerHeaders(),
  });
  assertEqual(response.status, 405, "status");
}

async function assertInvalidBody400(): Promise<void> {
  console.log("[api] McpJsonRpcController returns 400 for invalid JSON-RPC body...");
  const { controller } = buildController();
  const response = await controller.handle({
    method: "POST",
    path: "/mcp",
    headers: bearerHeaders(),
    body: "not-an-object",
  });
  assertEqual(response.status, 400, "status");
  const body = response.body as McpJsonRpcResponse;
  assertEqual(body.error?.code, -32600, "invalid request");
  assertEqual(body.id, null, "id null");
}

async function assertToolsListSuccess(): Promise<void> {
  console.log("[api] McpJsonRpcController POST /mcp tools/list succeeds...");
  const recording = new RecordingHandler();
  const { controller } = buildController(recording);
  const response = await controller.handle({
    method: "POST",
    path: "/mcp",
    headers: bearerHeaders(),
    body: { jsonrpc: "2.0", id: 7, method: MCP_METHOD_TOOLS_LIST },
  });
  assertEqual(response.status, 200, "status");
  assertEqual(recording.lastRequest?.method, MCP_METHOD_TOOLS_LIST, "delegated");
  const body = response.body as McpJsonRpcResponse;
  assertEqual(body.id, 7, "id");
  assertTruthy(body.result !== undefined, "result");
}

async function assertToolsCallWorkspaceDenied(): Promise<void> {
  console.log(
    "[api] McpJsonRpcController tools/call denies workspace mismatch with -32001...",
  );
  const recording = new RecordingHandler();
  const { controller } = buildController(recording);
  const response = await controller.handle({
    method: "POST",
    path: "/mcp",
    headers: bearerHeaders(API_KEY),
    body: {
      jsonrpc: "2.0",
      id: 3,
      method: MCP_METHOD_TOOLS_CALL,
      params: {
        name: "generate_cited_grounded_answer",
        arguments: { workspaceId: "other-workspace", query: "q" },
      },
    },
  });
  assertEqual(response.status, 200, "status");
  const body = response.body as McpJsonRpcResponse;
  assertEqual(body.error?.code, -32001, "workspace denied");
  assertEqual(body.error?.message, "Workspace access denied", "message");
  assertEqual(recording.lastRequest, undefined, "handler not called");
}

async function assertToolsCallAllowed(): Promise<void> {
  console.log("[api] McpJsonRpcController tools/call allows matching workspace...");
  const handler = new DefaultMcpJsonRpcHandler(new FakeRegistry());
  const { controller } = buildController(handler);
  const response = await controller.handle({
    method: "POST",
    path: "/mcp",
    headers: bearerHeaders(),
    body: {
      jsonrpc: "2.0",
      id: 4,
      method: MCP_METHOD_TOOLS_CALL,
      params: {
        name: "generate_cited_grounded_answer",
        arguments: { workspaceId: WORKSPACE_A, query: "q" },
      },
    },
  });
  assertEqual(response.status, 200, "status");
  const body = response.body as McpJsonRpcResponse;
  assertEqual(body.error, undefined, "no error");
  const result = body.result as { isError: boolean };
  assertEqual(result.isError, false, "isError");
}

async function main(): Promise<void> {
  await assertUnauthorized();
  await assertMethodNotAllowed();
  await assertInvalidBody400();
  await assertToolsListSuccess();
  await assertToolsCallWorkspaceDenied();
  await assertToolsCallAllowed();
  console.log("McpJsonRpcController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
