import type { DocumentChunk } from "../domain/DocumentChunk";

/**
 * A single hydrated chunk resolved from a {@link VectorRetriever} query,
 * paired with the similarity score its vector was ranked with.
 */
export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
}

/**
 * Result of a single {@link VectorRetriever} retrieval request.
 *
 * `chunks` preserves the ranking order the underlying `VectorIndex`
 * produced (best match first) — retrievers do not re-sort.
 */
export interface RetrievalResult {
  query: string;
  chunks: RetrievedChunk[];
}
