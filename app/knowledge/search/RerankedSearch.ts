import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Port for deterministic, re-ranked search within one workspace: a
 * `HybridSearch` result whose chunks have been re-ordered by a
 * `Reranker`'s relevance signal.
 *
 * Reuses the retrieval module's `RetrievalInput`/`RetrievalResult`
 * shapes — reranked search is a fourth, still-interchangeable way of
 * turning the same `(workspaceId, query, limit)` request into ranked,
 * hydrated chunks. Concrete adapters live under `app/knowledge/search`
 * and are wired only at the composition root.
 */
export interface RerankedSearch {
  search(input: RetrievalInput): Promise<RetrievalResult>;
}
