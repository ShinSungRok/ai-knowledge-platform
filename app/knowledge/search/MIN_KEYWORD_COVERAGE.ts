/**
 * Default minimum query-token coverage a candidate must reach to survive
 * {@link ThresholdFilteringKeywordSearch}. `DefaultKeywordSearch` includes
 * any chunk that matches even one query token, regardless of how small a
 * fraction of the query that token represents — a query sharing only an
 * incidental, formulaic token with an otherwise unrelated chunk (e.g. an
 * article-number label like "제1조", which appears in nearly every law
 * article) still gets included, then reaches `NormalizedReranker` with a
 * real (not RRF-discarded) but very weak keyword signal, which turned out
 * to be enough on its own to clear a low relevance gate. `0.3` requires at
 * least 30% of the query's unique tokens to appear in the chunk before its
 * keyword signal counts as real evidence, not just incidental overlap.
 */
export const MIN_KEYWORD_COVERAGE = 0.3;
