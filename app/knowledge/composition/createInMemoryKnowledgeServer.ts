import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultKnowledgeServer } from "../server/DefaultKnowledgeServer";
import type { KnowledgeServer } from "../server/KnowledgeServer";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpWorkspaceGuard } from "../security/HttpWorkspaceGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

/**
 * Wires in-memory composition → HTTP router → {@link DefaultKnowledgeServer}.
 * Includes workspace HTTP guard required by the cited-answer API.
 * Observability wrapping is provided separately by
 * `createOperationsKnowledgeServer`.
 */
export function createInMemoryKnowledgeServer(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
} {
  const composition = createInMemoryKnowledgeComposition(config);
  const guard = new HttpWorkspaceGuard(new DefaultWorkspaceAuthorizer());
  const router = createKnowledgeHttpRouter(composition.runtime, guard);
  const server = new DefaultKnowledgeServer(router);
  return { server, composition };
}
