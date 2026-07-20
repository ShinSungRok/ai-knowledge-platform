import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";

/**
 * Port for deterministic lexical (keyword) ranking of {@link DocumentChunk}s
 * within one workspace.
 *
 * Reuses the retrieval module's `RetrievalInput`/`RetrievalResult` shapes —
 * keyword search is a second, independent way of turning the same
 * `(workspaceId, query, limit)` request into ranked, hydrated chunks, so
 * callers (a future hybrid search / use case) can treat `VectorRetriever`
 * and `KeywordSearch` interchangeably at the input/output boundary.
 * Implementations own the tokenization/scoring; concrete adapters live
 * under `app/knowledge/search` and are wired only at the composition root.
 */
export interface KeywordSearch {
  search(input: RetrievalInput): Promise<RetrievalResult>;
}
