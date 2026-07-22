import type { McpJsonRpcHandler } from "./McpJsonRpcHandler";
import type { McpJsonRpcId } from "./McpJsonRpcId";
import type { McpJsonRpcRequest } from "./McpJsonRpcRequest";
import type { McpJsonRpcResponse } from "./McpJsonRpcResponse";
import type { McpStdioLineReader } from "./McpStdioLineReader";
import type { McpStdioLineWriter } from "./McpStdioLineWriter";
import {
  resolveMcpStdioSessionConfig,
  type McpStdioSessionConfig,
} from "./McpStdioSessionConfig";

function errorResponse(
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
 * Newline-delimited JSON-RPC session over stdio ports.
 *
 * Notifications (missing `id`) are rejected with -32600. Oversized lines
 * emit -32700 and the session continues. No Bearer AuthN (local process).
 * Official MCP SDK is not used.
 */
export class StdioMcpJsonRpcSession {
  private readonly maxLineBytes: number;
  private readonly ignoreEmptyLines: boolean;

  constructor(
    private readonly handler: McpJsonRpcHandler,
    private readonly reader: McpStdioLineReader,
    private readonly writer: McpStdioLineWriter,
    config?: McpStdioSessionConfig,
  ) {
    const resolved = resolveMcpStdioSessionConfig(config);
    this.maxLineBytes = resolved.maxLineBytes;
    this.ignoreEmptyLines = resolved.ignoreEmptyLines;
  }

  async run(): Promise<void> {
    for (;;) {
      const line = await this.reader.readLine();
      if (line === null) {
        return;
      }

      if (this.ignoreEmptyLines && line.trim().length === 0) {
        continue;
      }

      const byteLength = Buffer.byteLength(line, "utf8");
      if (byteLength > this.maxLineBytes) {
        await this.writeResponse(
          errorResponse(null, -32700, "Parse error"),
        );
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(line) as unknown;
      } catch {
        await this.writeResponse(
          errorResponse(null, -32700, "Parse error"),
        );
        continue;
      }

      const request = this.asRequest(parsed);
      if (request === null) {
        await this.writeResponse(
          errorResponse(null, -32600, "Invalid Request"),
        );
        continue;
      }

      const response = await this.handler.handle(request);
      await this.writeResponse(response);
    }
  }

  private async writeResponse(response: McpJsonRpcResponse): Promise<void> {
    await this.writer.writeLine(JSON.stringify(response));
  }

  /**
   * Returns a valid {@link McpJsonRpcRequest}, or null when the payload is
   * not a request (including notifications without `id`).
   */
  private asRequest(value: unknown): McpJsonRpcRequest | null {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, "id")) {
      // Notifications (no id) are unsupported in this transport subset.
      return null;
    }
    const id = record["id"];
    if (
      !(
        id === null ||
        typeof id === "string" ||
        typeof id === "number"
      )
    ) {
      return null;
    }
    if (record["jsonrpc"] !== "2.0") {
      return null;
    }
    if (typeof record["method"] !== "string" || record["method"].trim().length === 0) {
      return null;
    }
    if (
      record["params"] !== undefined &&
      (typeof record["params"] !== "object" ||
        record["params"] === null ||
        Array.isArray(record["params"]))
    ) {
      return null;
    }

    return {
      jsonrpc: "2.0",
      id: id as McpJsonRpcId,
      method: record["method"],
      ...(record["params"] !== undefined
        ? {
            params: record["params"] as Readonly<Record<string, unknown>>,
          }
        : {}),
    };
  }
}
