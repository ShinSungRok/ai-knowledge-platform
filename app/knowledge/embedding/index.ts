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
 * Vector indexing implementation is still deferred.
 */
export const KNOWLEDGE_MODULE_EMBEDDING = "app/knowledge/embedding" as const;

export type { ChunkingService } from "./ChunkingService";
export { FixedSizeDocumentChunker } from "./FixedSizeDocumentChunker";
export { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
export type { EmbeddingProvider } from "./EmbeddingProvider";
export { FakeEmbeddingProvider } from "./FakeEmbeddingProvider";
