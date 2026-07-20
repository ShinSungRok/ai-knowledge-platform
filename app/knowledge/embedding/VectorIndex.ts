import type { EmbeddingVector } from "./EmbeddingVector";
import type { ScoredEmbeddingVector } from "./ScoredEmbeddingVector";

/**
 * Persistence-agnostic port for embedding vector storage and nearest-
 * neighbor query.
 *
 * Every read/write is scoped to a `workspaceId` and, within that, treats
 * `chunkId` as the effective identity — `upsert` replaces any existing
 * vector for the same `(workspaceId, chunkId)`. `findNearest` ranks only
 * vectors within the same `workspaceId` by similarity to `queryVector`,
 * returning at most `limit` results ordered best-first. `deleteByChunkId`
 * removes a stored vector for `(workspaceId, chunkId)` and is a no-op when
 * missing — it never throws for absence. This port has no knowledge of
 * `EmbeddingProvider`, `DocumentChunk`/`KnowledgeDocument` existence,
 * hybrid search, or re-ranking — those are the responsibility of callers
 * and other ports.
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
  deleteByChunkId(workspaceId: string, chunkId: string): Promise<void>;
  findNearest(
    workspaceId: string,
    queryVector: number[],
    limit: number,
  ): Promise<ScoredEmbeddingVector[]>;
}
