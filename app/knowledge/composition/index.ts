/**
 * Module: `app/knowledge/composition`
 *
 * Composition root — the only place that wires concrete adapters into a
 * runnable knowledge runtime.
 *
 * `createInMemoryKnowledgeComposition` assembles in-memory/fake adapters
 * through the cited-answer use-case chain and exposes a
 * {@link KnowledgeRuntime} entrypoint. `createInMemoryKnowledgeServer`
 * wires that runtime through the HTTP router into a
 * {@link DefaultKnowledgeServer}. `createOperationsKnowledgeServer` adds
 * workspace guard + `ObservingHttpRouter` (logger/metrics). Agent/Memory/
 * Jobs/MCP full wiring and real DB/network/LLM providers remain out of scope.
 * `createSqlDocumentKnowledgeComposition` wires SQL documents only;
 * `createSqlKnowledgeComposition` wires document+source+chunk SQL over a
 * shared InMemorySqlGateway (vector/cited-answer still in-memory/fake).
 * `createPostgresKnowledgeComposition` injects a PostgresPool into
 * PostgresSqlGateway (optional schema apply).
 * `createListeningOperationsServer` adds NodeHttpListener TCP listen on top
 * of operations wiring (default 127.0.0.1:0).
 */
export const KNOWLEDGE_MODULE_COMPOSITION = "app/knowledge/composition" as const;

export type { KnowledgeRuntime } from "./KnowledgeRuntime";
export type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";
export type { SqlDocumentKnowledgeComposition } from "./SqlDocumentKnowledgeComposition";
export type { SqlKnowledgeComposition } from "./SqlKnowledgeComposition";
export type { CreatePostgresKnowledgeCompositionOptions } from "./createPostgresKnowledgeComposition";
export type {
  CreateListeningOperationsServerOptions,
  ListeningOperationsServer,
} from "./createListeningOperationsServer";
export { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
export { createInMemoryKnowledgeServer } from "./createInMemoryKnowledgeServer";
export { createOperationsKnowledgeServer } from "./createOperationsKnowledgeServer";
export { createListeningOperationsServer } from "./createListeningOperationsServer";
export { createSqlDocumentKnowledgeComposition } from "./createSqlDocumentKnowledgeComposition";
export { createSqlKnowledgeComposition } from "./createSqlKnowledgeComposition";
export { createPostgresKnowledgeComposition } from "./createPostgresKnowledgeComposition";
