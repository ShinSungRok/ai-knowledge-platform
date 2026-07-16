import type { DocumentChunk } from "../domain/DocumentChunk";

/**
 * Persistence-agnostic port for document chunk storage.
 *
 * Every read/write is scoped to a `workspaceId` and, within that, a
 * `documentId` — concrete adapters must treat `(workspaceId, documentId)`
 * as the effective partition for a document's chunks, and `id` is only
 * unique within that partition.
 *
 * `replaceForDocument` is the only write method: it replaces the entire
 * chunk set for a document in one call (an empty array clears it), so
 * callers never need to diff old vs. new chunks themselves. This port has
 * no knowledge of chunking algorithms, embeddings, or whether the
 * referenced document actually exists — those are the responsibility of
 * callers (a future chunking pipeline) and other ports.
 *
 * Concrete adapters (in-memory, PostgreSQL, …) live under
 * `app/knowledge/persistence` and are wired only at the composition root.
 */
export interface DocumentChunkRepository {
  replaceForDocument(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void>;
  findByDocumentId(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentChunk[]>;
}
