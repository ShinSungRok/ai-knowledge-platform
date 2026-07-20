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
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpWorkspaceGuard } from "../security/HttpWorkspaceGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

/**
 * Operations-ready in-memory server: composition + workspace guard +
 * observing HTTP router + {@link DefaultKnowledgeServer}.
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
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  const innerRouter = createKnowledgeHttpRouter(composition.runtime, guard);
  const router = new ObservingHttpRouter(innerRouter, logger, metrics);
  const server = new DefaultKnowledgeServer(router);
  return { server, composition, logger, metrics };
}
