/**
 * Default minimum cosine similarity a candidate must reach to survive
 * {@link ThresholdFilteringVectorRetriever}.
 *
 * Scope, stated honestly: this threshold is calibrated to reject a query
 * that has nothing to do with anything in the workspace (empirically,
 * genuinely unrelated pairs scored ~0.10-0.30 against
 * `text-embedding-3-small` at 256 dimensions, while real topical matches
 * scored ~0.44-0.70) — it is a coarse "is this workspace even the right
 * place to look" gate, not a precision reranker. It does **not**
 * guarantee the single best-matching document is always chosen among
 * several in-domain candidates: a query reworded away from its matching
 * article's vocabulary can score *lower* than an unrelated article that
 * happens to share more surface-level phrasing (observed empirically —
 * a false-positive pair scored 0.49 against a true match's 0.44).
 * Fixing that would need a materially different technique (a larger
 * embedding, or a cross-encoder reranking stage) — out of scope here.
 */
export const MIN_VECTOR_SIMILARITY = 0.35;
