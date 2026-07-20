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
 * {@link DefaultKnowledgeServer}. Agent/Memory/Jobs/MCP full wiring and
 * real DB/network/LLM providers remain out of scope.
 */
export const KNOWLEDGE_MODULE_COMPOSITION = "app/knowledge/composition" as const;

export type { KnowledgeRuntime } from "./KnowledgeRuntime";
export type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";
export { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
export { createInMemoryKnowledgeServer } from "./createInMemoryKnowledgeServer";
