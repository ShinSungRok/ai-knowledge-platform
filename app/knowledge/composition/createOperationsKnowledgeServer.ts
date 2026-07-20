import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import { InMemoryLogger } from "../observability/InMemoryLogger";
import { InMemoryMetrics } from "../observability/InMemoryMetrics";
import { DefaultKnowledgeServer } from "../server/DefaultKnowledgeServer";
import type { KnowledgeServer } from "../server/KnowledgeServer";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { LlmProviderOption } from "./createLanguageModelProvider";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

export type CreateOperationsKnowledgeServerOptions = {
  apiKeys: Readonly<Record<string, ApiKeyPrincipalEntry>>;
  config?: KnowledgeRuntimeConfig;
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
};

/**
 * Operations-ready in-memory server: composition + Bearer AuthN +
 * workspace AuthZ + observing HTTP router + {@link DefaultKnowledgeServer}.
 * Baseline without observability remains {@link createInMemoryKnowledgeServer}.
 * `apiKeys` is required (empty map → all cited-answer calls 401).
 */
export function createOperationsKnowledgeServer(
  options: CreateOperationsKnowledgeServerOptions,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
} {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const composition = createInMemoryKnowledgeComposition(config, {
    llm: options.llm,
  });
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const authenticator = new ApiKeyAuthenticator(options.apiKeys);
  const bearerGuard = new HttpBearerGuard(authenticator);
  const workspaceAuthorizer = new DefaultWorkspaceAuthorizer();
  const innerRouter = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
  );
  const router = new ObservingHttpRouter(innerRouter, logger, metrics);
  const server = new DefaultKnowledgeServer(router);
  return { server, composition, logger, metrics };
}
