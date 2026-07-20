import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultKnowledgeServer } from "../server/DefaultKnowledgeServer";
import type { KnowledgeServer } from "../server/KnowledgeServer";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

/**
 * Wires in-memory composition → HTTP router → {@link DefaultKnowledgeServer}.
 * Concrete adapter assembly stays in the composition root.
 */
export function createInMemoryKnowledgeServer(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
} {
  const composition = createInMemoryKnowledgeComposition(config);
  const router = createKnowledgeHttpRouter(composition.runtime);
  const server = new DefaultKnowledgeServer(router);
  return { server, composition };
}
