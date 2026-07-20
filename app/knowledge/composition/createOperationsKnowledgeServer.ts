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
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";
import { IN_MEMORY_SERVER_TEST_API_KEY } from "./createInMemoryKnowledgeServer";

/**
 * Operations-ready in-memory server: composition + Bearer AuthN +
 * workspace AuthZ + observing HTTP router + {@link DefaultKnowledgeServer}.
 * Baseline without observability remains {@link createInMemoryKnowledgeServer}.
 */
export function createOperationsKnowledgeServer(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
  logger: InMemoryLogger;
  metrics: InMemoryMetrics;
} {
  const composition = createInMemoryKnowledgeComposition(config);
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const authenticator = new ApiKeyAuthenticator({
    [IN_MEMORY_SERVER_TEST_API_KEY]: {
      subject: "test-user",
      workspaceId: "workspace-a",
    },
  });
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
