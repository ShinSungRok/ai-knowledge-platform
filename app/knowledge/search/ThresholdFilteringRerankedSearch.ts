import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { RerankedSearch } from "./RerankedSearch";

/**
 * {@link RerankedSearch} decorator: wraps an inner `RerankedSearch` and
 * drops any candidate whose (already reranked) score falls below
 * `minScore`.
 *
 * Fixes the "no filtering" gap in the retrieval pipeline: without this,
 * a `VectorIndex` with at least one entry always returns its nearest
 * neighbor regardless of how irrelevant it actually is, so `context.blocks`
 * is (almost) never empty and `insufficientEvidence` never fires for a
 * genuinely off-topic query. With this decorator, a query whose best
 * candidates all score below `minScore` yields an empty chunk list —
 * `ContextAssembler`/`DefaultGroundedAnswerAssembler` then produce the
 * existing insufficient-evidence response with no changes to either.
 *
 * Depends only on the `RerankedSearch` port it wraps — never a concrete
 * `Reranker`/`HybridSearch`/`VectorRetriever` adapter. Never re-sorts
 * (the inner search already ranked descending); only filters. `minScore`
 * is validated once at construction, not per request.
 */
export class ThresholdFilteringRerankedSearch implements RerankedSearch {
  constructor(
    private readonly inner: RerankedSearch,
    private readonly minScore: number,
  ) {
    if (typeof minScore !== "number" || !Number.isFinite(minScore)) {
      throw new Error(
        "ThresholdFilteringRerankedSearch minScore must be a finite number",
      );
    }
  }

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const result = await this.inner.search(input);
    return {
      query: result.query,
      chunks: result.chunks.filter((retrieved) => retrieved.score >= this.minScore),
    };
  }
}
