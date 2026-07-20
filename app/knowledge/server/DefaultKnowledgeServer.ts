import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpRouter } from "../http/HttpRouter";
import type { KnowledgeServer } from "./KnowledgeServer";

/**
 * Default {@link KnowledgeServer}: start/stop flags and in-process
 * dispatch via an injected {@link HttpRouter}. No TCP listen/bind.
 */
export class DefaultKnowledgeServer implements KnowledgeServer {
  private running = false;

  constructor(private readonly router: HttpRouter) {}

  async start(): Promise<void> {
    if (this.running) {
      throw new Error("KnowledgeServer is already running");
    }
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) {
      throw new Error("KnowledgeServer is already stopped");
    }
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  async dispatch(request: HttpRequest): Promise<HttpResponse> {
    if (!this.running) {
      throw new Error("KnowledgeServer is not running");
    }
    return this.router.handle(request);
  }
}
