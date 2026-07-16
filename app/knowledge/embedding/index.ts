/**
 * Module: `app/knowledge/embedding`
 *
 * Chunking, embedding, and vector indexing ports/adapters.
 *
 * `ChunkingService` is the port for splitting a `KnowledgeDocument` into
 * ordered `DocumentChunk`s; `FixedSizeDocumentChunker` is a dependency-free,
 * deterministic fixed-size adapter. Embedding and vector indexing
 * implementation is still deferred.
 */
export const KNOWLEDGE_MODULE_EMBEDDING = "app/knowledge/embedding" as const;

export type { ChunkingService } from "./ChunkingService";
export { FixedSizeDocumentChunker } from "./FixedSizeDocumentChunker";
