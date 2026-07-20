import type { RetrievalInput } from "./RetrievalInput";
import type { RetrievalResult } from "./RetrievalResult";

/**
 * Port for turning a natural-language `query` into ranked, hydrated
 * {@link DocumentChunk}s within one workspace.
 *
 * Implementations own the embed → nearest-vector → chunk-hydration
 * pipeline; callers (a future `application` use case) never see the
 * `EmbeddingProvider`, `VectorIndex`, or `DocumentChunkRepository` this
 * involves. Concrete adapters live under `app/knowledge/retrieval` and are
 * wired only at the composition root.
 */
export interface VectorRetriever {
  retrieve(input: RetrievalInput): Promise<RetrievalResult>;
}
