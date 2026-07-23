import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import type { InMemoryLogger } from "../observability/InMemoryLogger";
import type { InMemoryMetrics } from "../observability/InMemoryMetrics";
import type { HttpListenAddress } from "../server/HttpListenAddress";
import type { HttpListenConfig } from "../server/HttpListenConfig";
import type { HttpListener } from "../server/HttpListener";
import type { ApiKeyPrincipalEntry } from "../security/ApiKeyAuthenticator";
import type { AuthProviderOption } from "./createAuthenticator";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { LlmProviderOption } from "./createLanguageModelProvider";
import {
  createListeningOperationsServerFromComposition,
} from "./createListeningOperationsServerFromComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

const DEFAULT_LISTEN: HttpListenConfig = {
  host: "127.0.0.1",
  port: 0,
};

export type CreateListeningOperationsServerOptions = {
  config?: KnowledgeRuntimeConfig;
  listen?: HttpListenConfig;
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
  /** Explicit AuthN provider. When set, `apiKeys` is ignored. */
  auth?: AuthProviderOption;
  /** Default ApiKey AuthN when `auth` is omitted. */
  apiKeys?: Readonly<Record<string, ApiKeyPrincipalEntry>>;
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
 * Operations wiring with {@link NodeHttpListener} for TCP listen over
 * InMemory composition. Optional OTLP export when
 * `OTEL_EXPORTER_OTLP_ENDPOINT` is set.
 */
export function createListeningOperationsServer(
  options: CreateListeningOperationsServerOptions,
): ListeningOperationsServer {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const listenConfig = options.listen ?? DEFAULT_LISTEN;
  const composition = createInMemoryKnowledgeComposition(config, {
    llm: options.llm,
  });
  const base = createListeningOperationsServerFromComposition({
    composition,
    listen: listenConfig,
    auth: options.auth,
    apiKeys: options.apiKeys,
  });
  return {
    ...base,
    composition,
  };
}
