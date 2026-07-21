import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { McpJsonRpcHandler } from "../mcp/McpJsonRpcHandler";
import type { McpJsonRpcId } from "../mcp/McpJsonRpcId";
import type { McpJsonRpcRequest } from "../mcp/McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "../mcp/McpJsonRpcResponse";
import {
  MCP_METHOD_TOOLS_CALL,
} from "../mcp/McpJsonRpcMethods";
import type { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";

const JSON_HEADERS = { "content-type": "application/json" } as const;
const MCP_PATH = "/mcp";

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: { ...JSON_HEADERS },
    body,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Internal Server Error";
}

function jsonRpcError(
  id: McpJsonRpcId,
  code: number,
  message: string,
): McpJsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

/**
 * HTTP controller for `POST /mcp` JSON-RPC MCP transport.
 * Requires Bearer AuthN. For `tools/call`, enforces
 * `arguments.workspaceId` vs principal workspace (AuthZ).
 */
export class McpJsonRpcController {
  constructor(
    private readonly handler: McpJsonRpcHandler,
    private readonly bearerGuard: HttpBearerGuard,
    private readonly workspaceAuthorizer: WorkspaceAuthorizer,
  ) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    if (request.path !== MCP_PATH) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }

    let principal;
    try {
      principal = await this.bearerGuard.authenticateRequest(request);
    } catch (error: unknown) {
      return jsonResponse(401, { error: errorMessage(error) });
    }

    const parsed = this.parseRequest(request.body);
    if (!parsed.ok) {
      return jsonResponse(400, parsed.response);
    }

    const rpcRequest = parsed.request;
    if (rpcRequest.method === MCP_METHOD_TOOLS_CALL) {
      const workspaceCheck = this.authorizeToolsCall(
        rpcRequest,
        principal.workspaceId,
      );
      if (workspaceCheck !== null) {
        return jsonResponse(200, workspaceCheck);
      }
    }

    const response = await this.handler.handle(rpcRequest);
    return jsonResponse(200, response);
  }

  private parseRequest(
    body: unknown,
  ):
    | { ok: true; request: McpJsonRpcRequest }
    | { ok: false; response: McpJsonRpcResponse } {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return {
        ok: false,
        response: jsonRpcError(null, -32600, "Invalid Request"),
      };
    }
    const record = body as Record<string, unknown>;
    const id = record["id"];
    const safeId: McpJsonRpcId =
      id === null || typeof id === "string" || typeof id === "number"
        ? id
        : null;

    if (record["jsonrpc"] !== "2.0") {
      return {
        ok: false,
        response: jsonRpcError(safeId, -32600, "Invalid Request"),
      };
    }
    if (typeof record["method"] !== "string" || record["method"].trim().length === 0) {
      return {
        ok: false,
        response: jsonRpcError(safeId, -32600, "Invalid Request"),
      };
    }
    if (
      !(
        id === null ||
        typeof id === "string" ||
        typeof id === "number"
      )
    ) {
      return {
        ok: false,
        response: jsonRpcError(null, -32600, "Invalid Request"),
      };
    }
    if (
      record["params"] !== undefined &&
      (typeof record["params"] !== "object" ||
        record["params"] === null ||
        Array.isArray(record["params"]))
    ) {
      return {
        ok: false,
        response: jsonRpcError(safeId, -32600, "Invalid Request"),
      };
    }

    return {
      ok: true,
      request: {
        jsonrpc: "2.0",
        id: id as McpJsonRpcId,
        method: record["method"],
        ...(record["params"] !== undefined
          ? {
              params: record["params"] as Readonly<Record<string, unknown>>,
            }
          : {}),
      },
    };
  }

  private authorizeToolsCall(
    request: McpJsonRpcRequest,
    principalWorkspaceId: string,
  ): McpJsonRpcResponse | null {
    const params = request.params;
    if (!params || typeof params !== "object") {
      return null;
    }
    const args = params["arguments"];
    if (
      args === undefined ||
      args === null ||
      typeof args !== "object" ||
      Array.isArray(args)
    ) {
      return null;
    }
    const workspaceId = (args as Record<string, unknown>)["workspaceId"];
    if (typeof workspaceId !== "string") {
      return null;
    }
    try {
      this.workspaceAuthorizer.authorize({
        workspaceId,
        principalWorkspaceId,
      });
      return null;
    } catch {
      return jsonRpcError(request.id, -32001, "Workspace access denied");
    }
  }
}
