/**
 * Unit-level cases for `DefaultRerankedSearch`
 * (`app/knowledge/search/DefaultRerankedSearch.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:search:reranked
 *
 * Covered behaviors:
 * - port contract: search is defined and callable
 * - calls HybridSearch.search before Reranker.rerank (verified via a
 *   shared call-order log across both counting test doubles), mapping
 *   the validated RetrievalInput onto both HybridSearch's own
 *   RetrievalInput and Reranker's RerankingInput
 *   (workspaceId/query/chunks, where chunks are exactly HybridSearch's
 *   own resolved result)
 * - returns the Reranker's own chunk order unchanged — proven with a
 *   reversing fake Reranker, showing DefaultRerankedSearch never
 *   re-sorts the reranked chunks itself
 * - returns an empty RetrievalResult when HybridSearch finds nothing,
 *   without the reranker erroring on an empty candidate set
 * - rejects invalid workspaceId/query/limit input (and a non-object
 *   input) before ever calling HybridSearch or Reranker
 * - DefaultRerankedSearch imports only the HybridSearch and Reranker
 *   ports, never a concrete adapter
 */
export const DEFAULT_RERANKED_SEARCH_UNIT_CASES = [
  "port_contract_search_is_defined",
  "calls_hybrid_search_before_reranker_with_mapped_input",
  "returns_reranker_output_order_without_further_sorting",
  "returns_empty_result_for_empty_hybrid_result",
  "rejects_invalid_input_without_calling_either_dependency",
  "imports_only_hybrid_search_and_reranker_ports",
] as const;
