/**
 * Module: `app/knowledge/embedding`
 *
 * Chunking, embedding, and vector indexing ports/adapters.
 *
 * `ChunkingService` is the port for splitting a `KnowledgeDocument` into
 * ordered `DocumentChunk`s; `FixedSizeDocumentChunker` is a dependency-free,
 * deterministic fixed-size adapter. `EmbeddingProvider` is the port for
 * turning text into a fixed-`EMBEDDING_VECTOR_DIMENSION` vector;
 * `FakeEmbeddingProvider` is a dependency-free, deterministic adapter.
 * `VectorIndex` is the port for storing/retrieving an `EmbeddingVector` by
 * `(workspaceId, chunkId)` and for `findNearest` cosine-similarity ranking
 * within a workspace (returning `ScoredEmbeddingVector[]`);
 * `InMemoryVectorIndex` and `SqlVectorIndex` (SqlGateway) are adapters.
 * Chunk hydration, retrieval, hybrid search, and re-ranking live elsewhere.
 */
export const KNOWLEDGE_MODULE_EMBEDDING = "app/knowledge/embedding" as const;

export type { ChunkingService } from "./ChunkingService";
export { FixedSizeDocumentChunker } from "./FixedSizeDocumentChunker";
export { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
export type { EmbeddingProvider } from "./EmbeddingProvider";
export { FakeEmbeddingProvider } from "./FakeEmbeddingProvider";
export type { EmbeddingVector } from "./EmbeddingVector";
export type { ScoredEmbeddingVector } from "./ScoredEmbeddingVector";
export type { VectorIndex } from "./VectorIndex";
export { InMemoryVectorIndex } from "./InMemoryVectorIndex";
export { SqlVectorIndex } from "./SqlVectorIndex";
