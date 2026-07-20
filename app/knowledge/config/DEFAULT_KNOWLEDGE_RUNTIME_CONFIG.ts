import type { KnowledgeRuntimeConfig } from "./KnowledgeRuntimeConfig";

/**
 * Default {@link KnowledgeRuntimeConfig} values for in-memory composition
 * and validation runners.
 */
export const DEFAULT_KNOWLEDGE_RUNTIME_CONFIG: KnowledgeRuntimeConfig = {
  defaultRetrievalLimit: 5,
  defaultMaxCharacters: 2000,
  defaultToolTimeoutMs: 1000,
  maxChunkLength: 200,
};
