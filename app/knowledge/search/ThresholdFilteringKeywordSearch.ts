import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { KeywordSearch } from "./KeywordSearch";
import { tokenize } from "./tokenize";

/**
 * {@link KeywordSearch} decorator: wraps an inner `KeywordSearch` and
 * drops any candidate whose query-token coverage falls below
 * `minCoverage`.
 *
 * The default keyword adapter includes a chunk the moment it matches
 * even one query token, no matter how small a fraction of the query that
 * token represents — a chunk sharing only an incidental, formulaic token
 * (e.g. an article-number label that appears in nearly every chunk in
 * the workspace) still counts as a "keyword hit" and reaches downstream
 * reranking with a real, non-trivial keyword signal, bypassing the
 * vector-side relevance filter entirely. This decorator recomputes each
 * surviving candidate's own coverage (the fraction of the query's unique
 * tokens present in the chunk) directly from `query`/`chunk.text` — the
 * same tokenization the default keyword and reranker adapters use — and
 * excludes anything below `minCoverage`.
 *
 * Depends only on the `KeywordSearch` port it wraps — never a concrete
 * `DocumentChunkRepository` adapter. Never re-sorts (the inner search
 * already ranks descending); only filters. `minCoverage` is validated
 * once at construction, not per request.
 */
export class ThresholdFilteringKeywordSearch implements KeywordSearch {
  constructor(
    private readonly inner: KeywordSearch,
    private readonly minCoverage: number,
  ) {
    if (
      typeof minCoverage !== "number" ||
      !Number.isFinite(minCoverage) ||
      minCoverage < 0 ||
      minCoverage > 1
    ) {
      throw new Error(
        "ThresholdFilteringKeywordSearch minCoverage must be a number between 0 and 1",
      );
    }
  }

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    const result = await this.inner.search(input);
    const queryTokens = new Set(tokenize(result.query));

    return {
      query: result.query,
      chunks: result.chunks.filter(
        (retrieved) => this.coverage(retrieved.chunk.text, queryTokens) >= this.minCoverage,
      ),
    };
  }

  private coverage(chunkText: string, queryTokens: Set<string>): number {
    if (queryTokens.size === 0) {
      return 0;
    }
    const chunkTokens = new Set(tokenize(chunkText));
    let matched = 0;
    for (const token of queryTokens) {
      if (chunkTokens.has(token)) {
        matched += 1;
      }
    }
    return matched / queryTokens.size;
  }
}
