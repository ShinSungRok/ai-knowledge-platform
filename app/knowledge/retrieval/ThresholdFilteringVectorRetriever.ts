import type { RetrievalInput } from "./RetrievalInput";
import type { RetrievalResult } from "./RetrievalResult";
import type { VectorRetriever } from "./VectorRetriever";

/**
 * {@link VectorRetriever} decorator: wraps an inner `VectorRetriever` and
 * drops any candidate whose cosine similarity falls below `minScore`.
 *
 * The default vector→hybrid→reranked pipeline loses this information one
 * stage too late to matter: `VectorIndex.findNearest` always returns its
 * closest neighbors regardless of how weak the match actually is, and
 * `HybridSearch`'s reciprocal-rank fusion then converts that into a
 * rank-only score — `1/(60+rank)` — that no longer carries the original
 * cosine similarity at all. A genuinely unrelated query still gets a
 * "rank 1" vector result and scores exactly as if it were a strong match.
 * Filtering here, on the raw `VectorRetriever` score, is the only point
 * in the pipeline where the actual similarity magnitude still exists.
 *
 * Depends only on the `VectorRetriever` port it wraps — never a concrete
 * `EmbeddingProvider`/`VectorIndex`/`DocumentChunkRepository` adapter.
 * Never re-sorts (the inner retriever already ranks descending); only
 * filters. `minScore` is validated once at construction, not per request.
 */
export class ThresholdFilteringVectorRetriever implements VectorRetriever {
  constructor(
    private readonly inner: VectorRetriever,
    private readonly minScore: number,
  ) {
    if (typeof minScore !== "number" || !Number.isFinite(minScore)) {
      throw new Error(
        "ThresholdFilteringVectorRetriever minScore must be a finite number",
      );
    }
  }

  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    const result = await this.inner.retrieve(input);
    return {
      query: result.query,
      chunks: result.chunks.filter((retrieved) => retrieved.score >= this.minScore),
    };
  }
}
