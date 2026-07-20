/**
 * Unit-level cases for RetrieveKnowledgeChunksUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:retrieve
 *
 * Covered behaviors:
 * - depends only on the VectorRetriever port — never a concrete retrieval
 *   adapter, embedding adapter, vector index, or repository
 * - execute validates workspaceId/query/limit at the application boundary,
 *   then passes the input through to VectorRetriever.retrieve unchanged
 * - execute returns the VectorRetriever's RetrievalResult unchanged (same
 *   query and chunks as a direct retriever call)
 * - execute rejects an empty/whitespace workspaceId or query, a
 *   non-positive or non-integer limit, and a non-object input — without
 *   ever calling VectorRetriever.retrieve
 */
export const RETRIEVE_KNOWLEDGE_CHUNKS_USE_CASE_UNIT_CASES = [
  "depends_only_on_vector_retriever_port",
  "execute_passes_valid_input_and_returns_result_unchanged",
  "rejects_invalid_input_without_calling_retriever",
] as const;
