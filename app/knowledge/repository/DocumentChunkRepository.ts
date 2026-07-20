import type { DocumentChunk } from "../domain/DocumentChunk";

/**
 * Persistence-agnostic port for document chunk storage.
 *
 * Every read/write is scoped to a `workspaceId` and, within that, `id` is a
 * workspace-global identity: unique across every document in that
 * workspace, not just within one document's own chunk set. `findByDocumentId`
 * still partitions reads by `(workspaceId, documentId)`; `findById` resolves
 * a single chunk anywhere in the workspace by that global identity.
 *
 * `replaceForDocument` is the only write method: it replaces the entire
 * chunk set for a document in one call (an empty array clears it), so
 * callers never need to diff old vs. new chunks themselves. Because `id` is
 * workspace-global, a batch that reuses an `id` already owned by a
 * *different* document in the same workspace must be rejected before any
 * write — reusing an `id` the *same* document already owns (e.g.
 * re-chunking with a deterministic id scheme) is always allowed. This port
 * has no knowledge of chunking algorithms, embeddings, or whether the
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
  findById(workspaceId: string, chunkId: string): Promise<DocumentChunk | null>;
}
