/**
 * Unit-level cases for RetrieveHybridKnowledgeChunksUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:retrieve-hybrid
 *
 * Covered behaviors:
 * - RetrieveHybridKnowledgeChunksUseCase.ts imports only the HybridSearch
 *   port — never DefaultHybridSearch, DefaultVectorRetriever,
 *   DefaultKeywordSearch, FakeEmbeddingProvider, InMemoryVectorIndex,
 *   DefaultInMemoryDocumentChunkRepository, or the embedding/persistence/
 *   repository modules
 * - execute validates workspaceId/query/limit, then passes valid input
 *   through to HybridSearch.search unchanged and returns its
 *   RetrievalResult unchanged
 * - execute rejects an empty/whitespace workspaceId or query, a
 *   non-positive or non-integer limit, and a non-object input, in every
 *   case without calling HybridSearch.search
 * - the existing RetrieveKnowledgeChunksUseCase and VectorRetriever
 *   contract are unaffected by this use case
 */
export const RETRIEVE_HYBRID_KNOWLEDGE_CHUNKS_USE_CASE_UNIT_CASES = [
  "depends_only_on_HybridSearch_port",
  "execute_passes_valid_input_and_returns_result_unchanged",
  "execute_rejects_invalid_input_without_calling_hybrid_search",
] as const;
