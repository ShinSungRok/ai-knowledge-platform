import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Port for deterministic reciprocal-rank-fusion search within one
 * workspace, combining vector and keyword retrieval into a single ranked
 * result.
 *
 * Reuses the retrieval module's `RetrievalInput`/`RetrievalResult` shapes —
 * hybrid search is a third, still-interchangeable way of turning the same
 * `(workspaceId, query, limit)` request into ranked, hydrated chunks.
 * Concrete adapters live under `app/knowledge/search` and are wired only
 * at the composition root.
 */
export interface HybridSearch {
  search(input: RetrievalInput): Promise<RetrievalResult>;
}
