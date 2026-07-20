/**
 * Canonical embedding vector — an already-computed {@link EmbeddingProvider}
 * output bound to the chunk it was derived from.
 *
 * `chunkId` is only unique within `workspaceId` — the storage boundary this
 * type is scoped to, mirroring `DocumentChunk`'s own identity. `vector` must
 * have exactly `EMBEDDING_VECTOR_DIMENSION` entries; this type only
 * describes the storage shape, it performs no validation itself.
 */
export interface EmbeddingVector {
  workspaceId: string;
  chunkId: string;
  vector: number[];
}
