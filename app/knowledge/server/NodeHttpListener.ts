import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { URL } from "node:url";
import type { HttpMethod } from "../http/HttpMethod";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { HttpListenAddress } from "./HttpListenAddress";
import type { HttpListenConfig } from "./HttpListenConfig";
import type { HttpListener } from "./HttpListener";

/**
 * {@link HttpListener} adapter using Node's built-in `node:http`.
 *
 * Translates IncomingMessage → {@link HttpRequest}, dispatches via an
 * injected {@link HttpRouter}, and writes {@link HttpResponse} as JSON.
 * Duplicate `close()` throws `"HttpListener is not listening"`.
 */
export class NodeHttpListener implements HttpListener {
  private server: Server | null = null;
  private listening = false;

  constructor(private readonly router: HttpRouter) {}

  async listen(config: HttpListenConfig): Promise<HttpListenAddress> {
    if (this.listening) {
      throw new Error("HttpListener is already listening");
    }
    if (typeof config.host !== "string" || config.host.trim().length === 0) {
      throw new Error("host must be a non-empty string");
    }
    if (
      typeof config.port !== "number" ||
      !Number.isInteger(config.port) ||
      config.port < 0
    ) {
      throw new Error("port must be a non-negative integer");
    }

    const server = createServer((req, res) => {
      void this.handleIncoming(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(config.port, config.host, () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (address === null || typeof address === "string") {
      server.close();
      throw new Error("Failed to resolve listening address");
    }

    this.server = server;
    this.listening = true;
    return { host: config.host, port: address.port };
  }

  async close(): Promise<void> {
    if (!this.listening || !this.server) {
      throw new Error("HttpListener is not listening");
    }
    const server = this.server;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = null;
    this.listening = false;
  }

  isListening(): boolean {
    return this.listening;
  }

  private async handleIncoming(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const method = req.method?.toUpperCase() ?? "";
      if (method !== "GET" && method !== "POST") {
        this.writeJson(res, 405, { error: "Method Not Allowed" });
        return;
      }

      const path = this.pathname(req.url ?? "/");
      const headers = this.lowerCaseHeaders(req.headers);
      let body: unknown;
      if (method === "POST") {
        const raw = await this.readBody(req);
        if (raw.length === 0) {
          body = undefined;
        } else {
          try {
            body = JSON.parse(raw);
          } catch {
            this.writeJson(res, 400, { error: "Invalid JSON body" });
            return;
          }
        }
      }

      const request: HttpRequest = {
        method: method as HttpMethod,
        path,
        headers,
        body,
      };
      const response = await this.router.handle(request);
      this.writeResponse(res, response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.writeJson(res, 500, { error: message });
    }
  }

  private pathname(url: string): string {
    try {
      return new URL(url, "http://localhost").pathname;
    } catch {
      return url.split("?")[0] ?? "/";
    }
  }

  private lowerCaseHeaders(
    headers: IncomingMessage["headers"],
  ): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) {
        continue;
      }
      out[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
    }
    return out;
  }

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      req.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
      req.on("error", reject);
    });
  }

  private writeResponse(res: ServerResponse, response: HttpResponse): void {
    const headers: Record<string, string> = { ...response.headers };
    if (response.body !== undefined && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    const payload =
      response.body === undefined ? undefined : JSON.stringify(response.body);
    res.writeHead(response.status, headers);
    res.end(payload);
  }

  private writeJson(
    res: ServerResponse,
    status: number,
    body: Record<string, unknown>,
  ): void {
    this.writeResponse(res, {
      status,
      headers: { "content-type": "application/json" },
      body,
    });
  }
}
