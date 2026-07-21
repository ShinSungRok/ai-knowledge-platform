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
 * Bearer AuthN + workspace AuthZ + `ObservingHttpRouter` (logger/metrics;
 * optional OTLP export when `OTEL_EXPORTER_OTLP_ENDPOINT` is set). Agent/Memory/
 * Jobs/MCP full wiring and real DB/network/LLM providers remain out of scope.
 * `createSqlDocumentKnowledgeComposition` wires SQL documents only;
 * `createSqlKnowledgeComposition` wires document+source+chunk SQL over a
 * shared InMemorySqlGateway (vector/cited-answer still in-memory/fake).
 * `createPostgresKnowledgeComposition` injects a PostgresPool into
 * PostgresSqlGateway (optional schema apply).
 * `createOpenSearchKnowledgeComposition` keeps SQL SoT and swaps VectorIndex
 * to OpenSearch (Fake/Fetch transport; official SDK deferred).
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
  CreateOperationsKnowledgeServerOptions,
} from "./createOperationsKnowledgeServer";
export type {
  CreateListeningOperationsServerOptions,
  ListeningOperationsServer,
} from "./createListeningOperationsServer";
export type { LlmProviderOption } from "./createLanguageModelProvider";
export { createLanguageModelProvider } from "./createLanguageModelProvider";
export type { CreateInMemoryKnowledgeCompositionOptions } from "./createInMemoryKnowledgeComposition";
export type { CreateSqlKnowledgeCompositionOptions } from "./createSqlKnowledgeComposition";
export type { CreateOpenSearchKnowledgeCompositionOptions } from "./createOpenSearchKnowledgeComposition";
export type { CreateOpenSearchKnowledgeCompositionOpenSearchOption } from "./createOpenSearchVectorIndexFromEnv";
export { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
export {
  createInMemoryKnowledgeServer,
  IN_MEMORY_SERVER_TEST_API_KEY,
} from "./createInMemoryKnowledgeServer";
export { createOperationsKnowledgeServer } from "./createOperationsKnowledgeServer";
export { createListeningOperationsServer } from "./createListeningOperationsServer";
export type { OperationsObservability } from "./createOperationsObservability";
export { createOperationsObservability } from "./createOperationsObservability";
export { createSqlDocumentKnowledgeComposition } from "./createSqlDocumentKnowledgeComposition";
export { createSqlKnowledgeComposition } from "./createSqlKnowledgeComposition";
export { createPostgresKnowledgeComposition } from "./createPostgresKnowledgeComposition";
export { createOpenSearchKnowledgeComposition } from "./createOpenSearchKnowledgeComposition";
export {
  createOpenSearchVectorIndexFromEnv,
  createFakeOpenSearchOption,
} from "./createOpenSearchVectorIndexFromEnv";
