import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import { InMemoryLogger } from "../observability/InMemoryLogger";
import { InMemoryMetrics } from "../observability/InMemoryMetrics";
import type { HttpListenAddress } from "../server/HttpListenAddress";
import type { HttpListenConfig } from "../server/HttpListenConfig";
import type { HttpListener } from "../server/HttpListener";
import { NodeHttpListener } from "../server/NodeHttpListener";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpWorkspaceGuard } from "../security/HttpWorkspaceGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

const DEFAULT_LISTEN: HttpListenConfig = {
  host: "127.0.0.1",
  port: 0,
};

export type CreateListeningOperationsServerOptions = {
  config?: KnowledgeRuntimeConfig;
  listen?: HttpListenConfig;
};

export type ListeningOperationsServer = {
  listener: HttpListener;
  composition: InMemoryKnowledgeComposition;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
  start(): Promise<HttpListenAddress>;
  stop(): Promise<void>;
};

/**
 * Operations wiring (composition + workspace guard + observing router) with
 * a {@link NodeHttpListener} for TCP listen. Dispatch-only path remains
 * {@link createOperationsKnowledgeServer}.
 *
 * Default listen is `{ host: "127.0.0.1", port: 0 }` (ephemeral). Production
 * callers should pass an explicit host/port.
 */
export function createListeningOperationsServer(
  options: CreateListeningOperationsServerOptions = {},
): ListeningOperationsServer {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const listenConfig = options.listen ?? DEFAULT_LISTEN;
  const composition = createInMemoryKnowledgeComposition(config);
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  const innerRouter = createKnowledgeHttpRouter(composition.runtime, guard);
  const router = new ObservingHttpRouter(innerRouter, logger, metrics);
  const listener = new NodeHttpListener(router);

  return {
    listener,
    composition,
    logger,
    metrics,
    start: () => listener.listen(listenConfig),
    stop: () => listener.close(),
  };
}
