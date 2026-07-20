/**
 * Module: `app/knowledge/search`
 *
 * Search engine abstraction (keyword, vector, hybrid).
 *
 * `KeywordSearch` (Task 28) is a deterministic lexical ranking port over
 * `DocumentChunkRepository`; `DefaultKeywordSearch` is its default adapter.
 * Vector search lives in `app/knowledge/retrieval` (`VectorRetriever`).
 * `HybridSearch` (Task 29) combines both via deterministic reciprocal-rank
 * fusion; `DefaultHybridSearch` is its default adapter. `Reranker` (Task
 * 34) is the port that deterministically re-orders an already-retrieved
 * `RetrievedChunk[]` by query relevance; a default adapter is a later
 * task.
 */
export const KNOWLEDGE_MODULE_SEARCH = "app/knowledge/search" as const;

export type { KeywordSearch } from "./KeywordSearch";
export { DefaultKeywordSearch } from "./DefaultKeywordSearch";
export type { HybridSearch } from "./HybridSearch";
export { DefaultHybridSearch } from "./DefaultHybridSearch";
export type { RerankingInput } from "./RerankingInput";
export type { Reranker } from "./Reranker";
