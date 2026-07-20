import type { EmbeddingVector } from "./EmbeddingVector";

/**
 * An {@link EmbeddingVector} paired with a similarity `score` against some
 * query vector, as produced by {@link VectorIndex.findNearest}.
 *
 * `score` has no fixed range guarantee beyond what the underlying
 * similarity metric (cosine similarity, for `InMemoryVectorIndex`)
 * produces — callers should treat it as ordinal (higher is more similar)
 * rather than assuming a normalized `[0, 1]` range in every adapter.
 */
export interface ScoredEmbeddingVector {
  vector: EmbeddingVector;
  score: number;
}
