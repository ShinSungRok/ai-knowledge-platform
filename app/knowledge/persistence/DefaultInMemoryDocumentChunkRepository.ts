import type { DocumentChunk } from "../domain/DocumentChunk";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";

/**
 * In-memory adapter for {@link DocumentChunkRepository}.
 *
 * Storage is partitioned by `workspaceId` first, then keyed by `documentId`
 * within that partition — so the same `documentId` can exist independently
 * in different workspaces, different documents in the same workspace never
 * share chunk storage, and every read/write is scoped to exactly one
 * `(workspaceId, documentId)` pair.
 *
 * `replaceForDocument` validates the entire incoming chunk set — including
 * that every chunk's `workspaceId`/`documentId` matches the method
 * arguments, and that ids/orders are well-formed and unique — before
 * mutating storage, so an invalid batch never leaves a partial write.
 *
 * Suitable for validation and early composition wiring. Replaceable by a
 * database adapter behind the same port with no domain/application changes.
 * Depends only on the `DocumentChunk` domain type and its own port — never
 * imports `KnowledgeDocumentRepository` or `KnowledgeSourceRepository`.
 */
export class DefaultInMemoryDocumentChunkRepository
  implements DocumentChunkRepository
{
  private readonly chunksByWorkspace = new Map<
    string,
    Map<string, DocumentChunk[]>
  >();

  async replaceForDocument(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(documentId, "documentId");
    const validated = this.assertAndCloneChunks(workspaceId, documentId, chunks);

    const workspace = this.getOrCreateWorkspace(workspaceId);
    if (validated.length === 0) {
      workspace.delete(documentId);
      return;
    }
    workspace.set(documentId, validated);
  }

  async findByDocumentId(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentChunk[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(documentId, "documentId");
    const stored = this.chunksByWorkspace.get(workspaceId)?.get(documentId);
    if (!stored) {
      return [];
    }
    return stored.map((chunk) => this.clone(chunk));
  }

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, DocumentChunk[]> {
    let workspace = this.chunksByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, DocumentChunk[]>();
      this.chunksByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
  }

  /**
   * Validates every chunk in the batch — shape, scope match, and
   * id/order uniqueness — and returns defensive clones sorted by `order`
   * ascending. Performs no mutation of stored state.
   */
  private assertAndCloneChunks(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): DocumentChunk[] {
    if (!Array.isArray(chunks)) {
      throw new Error("DocumentChunk[] must be an array");
    }

    const seenIds = new Set<string>();
    const seenOrders = new Set<number>();
    const cloned: DocumentChunk[] = [];

    for (const chunk of chunks) {
      this.assertChunk(chunk);

      if (chunk.workspaceId !== workspaceId) {
        throw new Error(
          `DocumentChunk.workspaceId (${chunk.workspaceId}) does not match the requested workspaceId (${workspaceId})`,
        );
      }
      if (chunk.documentId !== documentId) {
        throw new Error(
          `DocumentChunk.documentId (${chunk.documentId}) does not match the requested documentId (${documentId})`,
        );
      }
      if (seenIds.has(chunk.id)) {
        throw new Error(`Duplicate DocumentChunk.id in replaceForDocument batch: ${chunk.id}`);
      }
      seenIds.add(chunk.id);
      if (seenOrders.has(chunk.order)) {
        throw new Error(`Duplicate DocumentChunk.order in replaceForDocument batch: ${chunk.order}`);
      }
      seenOrders.add(chunk.order);

      cloned.push(this.clone(chunk));
    }

    return cloned.sort((a, b) => a.order - b.order);
  }

  private assertChunk(chunk: DocumentChunk): void {
    if (!chunk || typeof chunk !== "object") {
      throw new Error("DocumentChunk must be an object");
    }
    this.assertNonEmptyString(chunk.workspaceId, "workspaceId");
    this.assertNonEmptyString(chunk.id, "id");
    this.assertNonEmptyString(chunk.documentId, "documentId");
    this.assertNonEmptyString(chunk.text, "text");
    if (
      typeof chunk.order !== "number" ||
      !Number.isInteger(chunk.order) ||
      chunk.order < 0
    ) {
      throw new Error("DocumentChunk.order must be a non-negative integer");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`DocumentChunk.${field} must be a non-empty string`);
    }
  }

  private clone(chunk: DocumentChunk): DocumentChunk {
    return {
      workspaceId: chunk.workspaceId,
      id: chunk.id,
      documentId: chunk.documentId,
      text: chunk.text,
      order: chunk.order,
    };
  }
}
