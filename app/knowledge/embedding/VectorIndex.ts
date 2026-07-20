import type { EmbeddingVector } from "./EmbeddingVector";

/**
 * Persistence-agnostic port for embedding vector storage.
 *
 * Every read/write is scoped to a `workspaceId` and, within that, treats
 * `chunkId` as the effective identity — `upsert` replaces any existing
 * vector for the same `(workspaceId, chunkId)`. This port has no knowledge
 * of `EmbeddingProvider`, `DocumentChunk`/`KnowledgeDocument` existence, or
 * similarity search/ranking — those are the responsibility of callers (a
 * future embedding pipeline and retriever) and other ports.
 *
 * Concrete adapters (in-memory, a real vector database, …) live under
 * `app/knowledge/embedding` and are wired only at the composition root.
 */
export interface VectorIndex {
  upsert(vector: EmbeddingVector): Promise<void>;
  findByChunkId(
    workspaceId: string,
    chunkId: string,
  ): Promise<EmbeddingVector | null>;
}
