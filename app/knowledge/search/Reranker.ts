import type { RerankingInput } from "./RerankingInput";
import type { RetrievedChunk } from "../retrieval/RetrievalResult";

/**
 * Port for deterministically re-ordering a set of already-retrieved
 * chunks by query relevance, within one workspace.
 *
 * Reuses the retrieval module's `RetrievedChunk` shape — re-ranking never
 * introduces a new candidate or drops one, it only reorders (and may
 * rescore) the ones it is given. Concrete adapters live under
 * `app/knowledge/search` and are wired only at the composition root.
 */
export interface Reranker {
  rerank(input: RerankingInput): Promise<RetrievedChunk[]>;
}
