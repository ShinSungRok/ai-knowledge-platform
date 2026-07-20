/**
 * Canonical document chunk — framework-independent domain type.
 * Zero outward dependencies (Clean Architecture / DDD).
 *
 * A traceable, orderable segment of a `KnowledgeDocument`'s text. `id` is a
 * workspace-global identity — unique across every document within
 * `workspaceId`, not just within `documentId` — so it can double as the
 * `chunkId` a `VectorIndex` vector is keyed by. `order` is the chunk's
 * position within its own document (0-based, ascending, unique per
 * document).
 *
 * Deliberately excludes `sourceId`: provenance already flows through
 * `documentId` → `KnowledgeDocument.sourceId`, so a chunk never duplicates
 * it. Chunk generation (splitting a document's text) and any link to
 * embeddings are out of scope for this type — it only describes the
 * storage shape of an already-produced chunk.
 */
export interface DocumentChunk {
  workspaceId: string;
  id: string;
  documentId: string;
  text: string;
  order: number;
}
