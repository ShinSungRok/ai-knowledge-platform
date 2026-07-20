/**
 * Validated runtime configuration for knowledge platform defaults.
 *
 * All fields are positive integers used as composition/runtime fallbacks
 * (retrieval limit, context budget, tool timeout, chunker size).
 */
export interface KnowledgeRuntimeConfig {
  defaultRetrievalLimit: number;
  defaultMaxCharacters: number;
  defaultToolTimeoutMs: number;
  maxChunkLength: number;
}
