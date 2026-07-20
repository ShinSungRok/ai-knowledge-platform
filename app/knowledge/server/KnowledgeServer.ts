import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";

/**
 * In-process knowledge server lifecycle and request dispatch.
 * Does not bind TCP sockets.
 */
export interface KnowledgeServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  dispatch(request: HttpRequest): Promise<HttpResponse>;
}
