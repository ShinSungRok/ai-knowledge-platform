/**
 * Module: `app/knowledge/embedding`
 *
 * Chunking, embedding, and vector indexing ports/adapters, plus an
 * OpenSearch HTTP boundary for VectorIndex (official OpenSearch JS SDK
 * deferred).
 *
 * `ChunkingService` / `FixedSizeDocumentChunker`, `EmbeddingProvider` /
 * `FakeEmbeddingProvider`, and `VectorIndex` with `InMemoryVectorIndex` /
 * `SqlVectorIndex` remain the default paths. `OpenSearchHttpTransport` /
 * `OpenSearchClientConfig` define optional OpenSearch REST access.
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
export type { OpenSearchHttpRequest } from "./OpenSearchHttpRequest";
export type { OpenSearchHttpResponse } from "./OpenSearchHttpResponse";
export type { OpenSearchHttpTransport } from "./OpenSearchHttpTransport";
export type { OpenSearchClientConfig } from "./OpenSearchClientConfig";
export { loadOpenSearchClientConfig } from "./loadOpenSearchClientConfig";
