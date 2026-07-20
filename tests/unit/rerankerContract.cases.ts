/**
 * Unit-level cases for the `app/knowledge/search` re-ranking contract
 * (`RerankingInput`, `Reranker`).
 *
 * Executed via:
 *
 *   pnpm validate:search:rerank-contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_SEARCH is exported with its expected value
 * - Reranker is implementable from just the exported contract types (no
 *   concrete adapter exists yet) and its `rerank` method is callable,
 *   returning a `RetrievedChunk[]` whose shape matches the retrieval
 *   module's own `RetrievedChunk`
 * - RerankingInput/Reranker accommodate an empty chunk list (empty
 *   result)
 * - the top-level app/knowledge barrel re-exports
 *   RerankingInput/Reranker, verified via a compile-time
 *   type-assignability check
 */
export const RERANKER_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "reranker_port_contract_is_implementable_and_callable",
  "reranking_input_accepts_empty_chunks",
  "top_level_barrel_exports_contract_types",
] as const;
