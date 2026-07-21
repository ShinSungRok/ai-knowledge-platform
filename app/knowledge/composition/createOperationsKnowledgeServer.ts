import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import type { InMemoryLogger } from "../observability/InMemoryLogger";
import type { InMemoryMetrics } from "../observability/InMemoryMetrics";
import { DefaultKnowledgeServer } from "../server/DefaultKnowledgeServer";
import type { KnowledgeServer } from "../server/KnowledgeServer";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import {
  createAuthenticatorFromOption,
  type AuthProviderOption,
} from "./createAuthenticator";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { LlmProviderOption } from "./createLanguageModelProvider";
import { createOperationsObservability } from "./createOperationsObservability";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

export type CreateOperationsKnowledgeServerOptions = {
  config?: KnowledgeRuntimeConfig;
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
  /** Explicit AuthN provider. When set, `apiKeys` is ignored. */
  auth?: AuthProviderOption;
  /** Default ApiKey AuthN when `auth` is omitted. */
  apiKeys?: Readonly<Record<string, ApiKeyPrincipalEntry>>;
};

function resolveAuthenticator(
  options: CreateOperationsKnowledgeServerOptions,
) {
  if (options.auth !== undefined) {
    return createAuthenticatorFromOption(options.auth);
  }
  if (options.apiKeys !== undefined) {
    return createAuthenticatorFromOption({
      type: "apiKey",
      apiKeys: options.apiKeys,
    });
  }
  throw new Error(
    "createOperationsKnowledgeServer requires apiKeys or auth",
  );
}

/**
 * Operations-ready in-memory server: composition + Bearer AuthN +
 * workspace AuthZ + observing HTTP router + {@link DefaultKnowledgeServer}.
 * When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, router logs/metrics use
 * Exporting adapters over the same InMemory sinks (default remains InMemory).
 */
export function createOperationsKnowledgeServer(
  options: CreateOperationsKnowledgeServerOptions,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
  flushObservability?: () => Promise<void>;
} {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const composition = createInMemoryKnowledgeComposition(config, {
    llm: options.llm,
  });
  const observability = createOperationsObservability();
  const authenticator = resolveAuthenticator(options);
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
  const server = new DefaultKnowledgeServer(router);
  return {
    server,
    composition,
    logger: observability.logger,
    metrics: observability.metrics,
    ...(observability.flushObservability
      ? { flushObservability: observability.flushObservability }
      : {}),
  };
}
