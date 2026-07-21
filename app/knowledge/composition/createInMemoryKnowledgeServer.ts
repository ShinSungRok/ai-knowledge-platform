import { createKnowledgeHttpRouter } from "../api/createKnowledgeHttpRouter";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultKnowledgeServer } from "../server/DefaultKnowledgeServer";
import type { KnowledgeServer } from "../server/KnowledgeServer";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";

/** Fixture API key for in-memory server validations (workspace-a). */
export const IN_MEMORY_SERVER_TEST_API_KEY = "test-api-key";

/**
 * Wires in-memory composition → HTTP router → {@link DefaultKnowledgeServer}.
 * Cited-answer requires Bearer API key AuthN + workspace AuthZ.
 */
export function createInMemoryKnowledgeServer(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
): {
  server: KnowledgeServer;
  composition: InMemoryKnowledgeComposition;
} {
  const composition = createInMemoryKnowledgeComposition(config);
  const authenticator = new ApiKeyAuthenticator({
    [IN_MEMORY_SERVER_TEST_API_KEY]: {
      subject: "test-user",
      workspaceId: "workspace-a",
    },
  });
  const bearerGuard = new HttpBearerGuard(authenticator);
  const workspaceAuthorizer = new DefaultWorkspaceAuthorizer();
  const router = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
  );
  const server = new DefaultKnowledgeServer(router);
  return { server, composition };
}
