/**
 * Unit-level cases for DefaultKeywordSearch.
 *
 * Executed via:
 *
 *   pnpm validate:search:keyword
 *
 * Covered behaviors:
 * - implements the KeywordSearch port contract
 * - search tokenizes query and chunk text into Unicode letter/number
 *   tokens, de-duplicates query tokens, and scores each chunk by the sum
 *   of exact match counts for each unique query token, ranking the
 *   highest-scoring chunk first
 * - search matches tokens case-insensitively
 * - search's de-duplication of query tokens does not affect how many
 *   times a repeated token is counted within the chunk text itself
 * - search excludes chunks with a zero score
 * - search breaks equal-score ties by chunk id ascending
 * - search returns at most limit chunks
 * - search only ranks chunks within the requested workspaceId
 * - search rejects an empty/whitespace workspaceId or query, a
 *   non-positive or non-integer limit, and a non-object input
 * - DefaultKeywordSearch's source never references a concrete adapter
 *   (DefaultInMemoryDocumentChunkRepository, InMemoryVectorIndex,
 *   FakeEmbeddingProvider, or the persistence module)
 */
export const DEFAULT_KEYWORD_SEARCH_UNIT_CASES = [
  "implements_KeywordSearch_port",
  "search_ranks_by_exact_token_match_count",
  "search_is_case_insensitive",
  "search_ignores_duplicate_query_tokens",
  "search_excludes_zero_score_chunks",
  "search_breaks_score_ties_by_chunk_id_ascending",
  "search_respects_limit",
  "search_isolates_by_workspace",
  "rejects_invalid_workspaceId_query_limit_input",
  "imports_only_ports_never_concrete_adapter",
] as const;
