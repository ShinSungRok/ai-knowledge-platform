/**
 * Unit-level cases for DefaultHybridSearch.
 *
 * Executed via:
 *
 *   pnpm validate:search:hybrid
 *
 * Covered behaviors:
 * - implements the HybridSearch port contract
 * - search fuses a vector-only result using only its vector-side
 *   reciprocal-rank contribution (1 / (60 + rank))
 * - search fuses a keyword-only result using only its keyword-side
 *   reciprocal-rank contribution
 * - search merges a chunk present in both vector and keyword results into
 *   a single entry, summing both sources' reciprocal-rank contributions
 * - search ranks a chunk found by both sources ahead of a chunk found by
 *   only one, driven purely by the combined fused score
 * - search breaks equal fused-score ties by chunk id ascending
 * - search passes workspaceId through to both VectorRetriever and
 *   KeywordSearch, isolating fused results per workspace
 * - search returns at most limit fused chunks
 * - search rejects an empty/whitespace workspaceId or query, a
 *   non-positive or non-integer limit, and a non-object input, in every
 *   case without calling VectorRetriever.retrieve or KeywordSearch.search
 * - DefaultHybridSearch's source never references a concrete adapter
 *   (DefaultInMemoryDocumentChunkRepository, InMemoryVectorIndex,
 *   FakeEmbeddingProvider, DefaultVectorRetriever, DefaultKeywordSearch,
 *   or the persistence module)
 */
export const DEFAULT_HYBRID_SEARCH_UNIT_CASES = [
  "implements_HybridSearch_port",
  "vector_only_result_is_fused",
  "keyword_only_result_is_fused",
  "overlapping_results_are_merged_and_fused",
  "fused_ranking_orders_by_combined_score_descending",
  "deterministic_tie_break_by_chunk_id_ascending",
  "workspace_passes_through_to_both_sources",
  "search_respects_limit",
  "rejects_invalid_input_without_calling_either_source",
  "imports_only_ports_never_concrete_adapter",
] as const;
