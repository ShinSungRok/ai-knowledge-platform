import type { DocumentChunk } from "../domain/DocumentChunk";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";

/**
 * In-memory adapter for {@link DocumentChunkRepository}.
 *
 * Storage is partitioned by `workspaceId` first, then keyed by `documentId`
 * within that partition — so the same `documentId` can exist independently
 * in different workspaces, different documents in the same workspace never
 * share chunk storage, and every read/write is scoped to exactly one
 * `(workspaceId, documentId)` pair. A second per-workspace index tracks
 * which `documentId` currently owns each chunk `id`, so `id` is enforced as
 * a workspace-global identity and `findById` can resolve a chunk from just
 * `(workspaceId, chunkId)`. `findAll` returns every chunk in a workspace,
 * sorted deterministically by `documentId` then `order` then `id` — never
 * relying on `Map` iteration/insertion order for callers that need a
 * stable whole-workspace scan (e.g. keyword search).
 *
 * `replaceForDocument` validates the entire incoming chunk set — shape,
 * that every chunk's `workspaceId`/`documentId` matches the method
 * arguments, that ids/orders are well-formed and unique within the batch,
 * and that no `id` in the batch is already owned by a *different* document
 * in the same workspace — before mutating storage or the ownership index,
 * so an invalid or conflicting batch never leaves a partial write. Reusing
 * an `id` the *same* document already owns is always allowed.
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
  private readonly chunkOwnerByWorkspace = new Map<string, Map<string, string>>();

  async replaceForDocument(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(documentId, "documentId");
    const validated = this.assertAndCloneChunks(workspaceId, documentId, chunks);

    const chunkOwners = this.getOrCreateChunkOwners(workspaceId);
    this.assertNoCrossDocumentChunkIdConflict(chunkOwners, documentId, validated);

    const workspace = this.getOrCreateWorkspace(workspaceId);
    const previousChunks = workspace.get(documentId);
    if (previousChunks) {
      for (const previous of previousChunks) {
        chunkOwners.delete(previous.id);
      }
    }
    for (const chunk of validated) {
      chunkOwners.set(chunk.id, documentId);
    }

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

  async findById(
    workspaceId: string,
    chunkId: string,
  ): Promise<DocumentChunk | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "id");

    const documentId = this.chunkOwnerByWorkspace.get(workspaceId)?.get(chunkId);
    if (!documentId) {
      return null;
    }
    const stored = this.chunksByWorkspace.get(workspaceId)?.get(documentId);
    const found = stored?.find((chunk) => chunk.id === chunkId);
    return found ? this.clone(found) : null;
  }

  async findAll(workspaceId: string): Promise<DocumentChunk[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");

    const workspace = this.chunksByWorkspace.get(workspaceId);
    if (!workspace) {
      return [];
    }

    const all: DocumentChunk[] = [];
    for (const chunks of workspace.values()) {
      for (const chunk of chunks) {
        all.push(this.clone(chunk));
      }
    }

    return all.sort((a, b) => {
      if (a.documentId !== b.documentId) {
        return a.documentId < b.documentId ? -1 : 1;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      if (a.id !== b.id) {
        return a.id < b.id ? -1 : 1;
      }
      return 0;
    });
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

  private getOrCreateChunkOwners(workspaceId: string): Map<string, string> {
    let owners = this.chunkOwnerByWorkspace.get(workspaceId);
    if (!owners) {
      owners = new Map<string, string>();
      this.chunkOwnerByWorkspace.set(workspaceId, owners);
    }
    return owners;
  }

  /**
   * Rejects the batch if any chunk `id` is already owned by a document
   * other than `documentId` — enforcing `id` as a workspace-global
   * identity. Performs no mutation; reusing an `id` `documentId` itself
   * already owns is always allowed.
   */
  private assertNoCrossDocumentChunkIdConflict(
    chunkOwners: Map<string, string>,
    documentId: string,
    chunks: DocumentChunk[],
  ): void {
    for (const chunk of chunks) {
      const owner = chunkOwners.get(chunk.id);
      if (owner && owner !== documentId) {
        throw new Error(
          `DocumentChunk.id (${chunk.id}) is already owned by a different document (${owner}) in this workspace`,
        );
      }
    }
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
