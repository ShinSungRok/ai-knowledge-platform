/**
 * Default minimum {@link NormalizedReranker} score a candidate must reach
 * to be treated as evidence by {@link ThresholdFilteringRerankedSearch}.
 * On the normalized 0..1 scale, this rejects candidates that are near-zero
 * on both the vector and keyword signals — i.e. queries genuinely
 * unrelated to anything in the workspace — while still admitting a weak
 * but real single-signal match.
 */
export const MIN_RELEVANCE_SCORE = 0.1;
