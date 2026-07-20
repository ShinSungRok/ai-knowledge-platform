/**
 * Module: `app/knowledge/config`
 *
 * Typed, validated runtime configuration for the knowledge platform.
 *
 * `KnowledgeRuntimeConfig` holds positive-integer defaults for retrieval
 * limit, context budget, tool timeout, and chunk length.
 * `loadKnowledgeRuntimeConfig` validates a plain object and returns a
 * defensive copy — it does not parse `process.env` or load dotenv.
 * `DEFAULT_KNOWLEDGE_RUNTIME_CONFIG` supplies composition defaults.
 */
export const KNOWLEDGE_MODULE_CONFIG = "app/knowledge/config" as const;

export type { KnowledgeRuntimeConfig } from "./KnowledgeRuntimeConfig";
export { DEFAULT_KNOWLEDGE_RUNTIME_CONFIG } from "./DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
export { loadKnowledgeRuntimeConfig } from "./loadKnowledgeRuntimeConfig";
