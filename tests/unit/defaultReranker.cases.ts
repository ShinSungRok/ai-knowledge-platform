/**
 * Unit-level cases for `DefaultReranker`
 * (`app/knowledge/search/DefaultReranker.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:search:reranker
 *
 * Covered behaviors:
 * - port contract: rerank is defined and callable
 * - ranks a candidate covering more unique query tokens ahead of one
 *   covering fewer (coverage)
 * - resolves an equal-coverage tie by token density (higher density
 *   wins)
 * - adds the candidate's original retrieved score into the reranked
 *   score, so it can break an otherwise-equal coverage+density
 *   comparison
 * - breaks an exact reranked-score tie by chunk id ascending
 * - accepts and validates workspaceId without using it to filter
 *   candidates by their own chunk.workspaceId (workspace isolation is
 *   the caller's responsibility upstream)
 * - returns an empty array for an empty chunk list
 * - never mutates the input array or its RetrievedChunk/DocumentChunk
 *   objects, and returns fresh objects safe to mutate independently
 * - rejects invalid workspaceId/query/chunks input, and malformed
 *   RetrievedChunk entries (missing chunk fields, non-finite score)
 * - DefaultReranker imports only ports/internal utilities, never a
 *   concrete adapter
 *
 * Also covers the shared `tokenize` utility extraction
 * (`app/knowledge/search/tokenize.ts`): `DefaultKeywordSearch`'s existing
 * scoring behavior and public contract are unchanged after the
 * extraction (verified by re-running `validate:search:keyword`).
 */
export const DEFAULT_RERANKER_UNIT_CASES = [
  "port_contract_rerank_is_defined",
  "ranks_by_query_token_coverage",
  "resolves_equal_coverage_ties_by_density",
  "original_retrieved_score_contributes_to_ranking",
  "breaks_exact_score_ties_by_chunk_id_ascending",
  "preserves_workspace_id_without_filtering_candidates",
  "returns_empty_for_empty_chunks",
  "does_not_mutate_input_and_returns_fresh_objects",
  "rejects_invalid_input",
  "imports_only_ports_never_concrete_adapter",
] as const;
