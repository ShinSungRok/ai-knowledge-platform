import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import type { InMemoryLogger } from "../observability/InMemoryLogger";
import type { InMemoryMetrics } from "../observability/InMemoryMetrics";
import type { HttpListenAddress } from "../server/HttpListenAddress";
import type { HttpListenConfig } from "../server/HttpListenConfig";
import type { HttpListener } from "../server/HttpListener";
import { NodeHttpListener } from "../server/NodeHttpListener";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { LlmProviderOption } from "./createLanguageModelProvider";
import { createOperationsObservability } from "./createOperationsObservability";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

const DEFAULT_LISTEN: HttpListenConfig = {
  host: "127.0.0.1",
  port: 0,
};

export type CreateListeningOperationsServerOptions = {
  apiKeys: Readonly<Record<string, ApiKeyPrincipalEntry>>;
  config?: KnowledgeRuntimeConfig;
  listen?: HttpListenConfig;
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
};

export type ListeningOperationsServer = {
  listener: HttpListener;
  composition: InMemoryKnowledgeComposition;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
  flushObservability?: () => Promise<void>;
  start(): Promise<HttpListenAddress>;
  stop(): Promise<void>;
};

/**
 * Operations wiring with {@link NodeHttpListener} for TCP listen.
 * Optional OTLP export when `OTEL_EXPORTER_OTLP_ENDPOINT` is set
 * (default observability remains InMemory).
 */
export function createListeningOperationsServer(
  options: CreateListeningOperationsServerOptions,
): ListeningOperationsServer {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const listenConfig = options.listen ?? DEFAULT_LISTEN;
  const composition = createInMemoryKnowledgeComposition(config, {
    llm: options.llm,
  });
  const observability = createOperationsObservability();
  const authenticator = new ApiKeyAuthenticator(options.apiKeys);
  const bearerGuard = new HttpBearerGuard(authenticator);
  const workspaceAuthorizer = new DefaultWorkspaceAuthorizer();
  const innerRouter = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
  );
  const router = new ObservingHttpRouter(
    innerRouter,
    observability.routerLogger,
    observability.routerMetrics,
  );
  const listener = new NodeHttpListener(router);

  return {
    listener,
    composition,
    logger: observability.logger,
    metrics: observability.metrics,
    ...(observability.flushObservability
      ? { flushObservability: observability.flushObservability }
      : {}),
    start: () => listener.listen(listenConfig),
    stop: () => listener.close(),
  };
}
