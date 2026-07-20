/**
 * Module: `app/knowledge/search`
 *
 * Search engine abstraction (keyword, vector, hybrid).
 *
 * `KeywordSearch` (Task 28) is a deterministic lexical ranking port over
 * `DocumentChunkRepository`; `DefaultKeywordSearch` is its default adapter.
 * Vector search lives in `app/knowledge/retrieval` (`VectorRetriever`);
 * hybrid fusion of the two is a later task.
 */
export const KNOWLEDGE_MODULE_SEARCH = "app/knowledge/search" as const;

export type { KeywordSearch } from "./KeywordSearch";
export { DefaultKeywordSearch } from "./DefaultKeywordSearch";
