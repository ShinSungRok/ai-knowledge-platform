import type { RetrievedChunk } from "../retrieval/RetrievalResult";

/**
 * Input for a single {@link Reranker} request.
 *
 * `chunks` are the retrieved candidates to re-order — typically a
 * `HybridSearch`/`VectorRetriever`/`KeywordSearch` result's `chunks` —
 * and may arrive in any order; `Reranker` does not assume they are
 * pre-sorted. `workspaceId` bounds which workspace the candidates belong
 * to (re-ranking never crosses workspaces), and `query` is the same raw
 * text the candidates were originally retrieved with, used to score
 * relevance.
 */
export interface RerankingInput {
  workspaceId: string;
  query: string;
  chunks: RetrievedChunk[];
}
