import type { DocumentChunk } from "../domain/DocumentChunk";
import type { SqlGateway } from "../infra/SqlGateway";
import {
  SQL_DELETE_CHUNKS_BY_DOCUMENT,
  SQL_INSERT_DOCUMENT_CHUNK,
  SQL_SELECT_CHUNK_BY_ID,
  SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID,
  SQL_SELECT_CHUNKS_BY_DOCUMENT,
  SQL_SELECT_CHUNKS_BY_WORKSPACE,
} from "../infra/documentChunkSql";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";

/**
 * SQL-backed {@link DocumentChunkRepository} over a {@link SqlGateway}.
 *
 * Assumes table `document_chunks(workspace_id, id, document_id, source_id,
 * order_index, text)` with primary key `(workspace_id, id)`. Domain chunks
 * do not carry `sourceId`; adapters persist an empty `source_id`.
 */
export class SqlDocumentChunkRepository implements DocumentChunkRepository {
  constructor(private readonly gateway: SqlGateway) {}

  async replaceForDocument(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(documentId, "documentId");
    const validated = this.assertAndCloneChunks(workspaceId, documentId, chunks);
    await this.assertNoCrossDocumentChunkIdConflict(
      workspaceId,
      documentId,
      validated,
    );

    await this.gateway.execute(SQL_DELETE_CHUNKS_BY_DOCUMENT, [
      workspaceId,
      documentId,
    ]);

    for (const chunk of validated) {
      await this.gateway.execute(SQL_INSERT_DOCUMENT_CHUNK, [
        chunk.workspaceId,
        chunk.id,
        chunk.documentId,
        "",
        chunk.order,
        chunk.text,
      ]);
    }
  }

  async findByDocumentId(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentChunk[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(documentId, "documentId");
    const result = await this.gateway.execute(SQL_SELECT_CHUNKS_BY_DOCUMENT, [
      workspaceId,
      documentId,
    ]);
    return result.rows.map((row) => this.mapRow(row));
  }

  async findById(
    workspaceId: string,
    chunkId: string,
  ): Promise<DocumentChunk | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "id");
    const result = await this.gateway.execute(SQL_SELECT_CHUNK_BY_ID, [
      workspaceId,
      chunkId,
    ]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]!);
  }

  async findAll(workspaceId: string): Promise<DocumentChunk[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    const result = await this.gateway.execute(SQL_SELECT_CHUNKS_BY_WORKSPACE, [
      workspaceId,
    ]);
    return result.rows.map((row) => this.mapRow(row));
  }

  private async assertNoCrossDocumentChunkIdConflict(
    workspaceId: string,
    documentId: string,
    chunks: DocumentChunk[],
  ): Promise<void> {
    for (const chunk of chunks) {
      const result = await this.gateway.execute(
        SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID,
        [workspaceId, chunk.id],
      );
      if (result.rows.length === 0) {
        continue;
      }
      const owner = result.rows[0]!.document_id;
      if (typeof owner !== "string") {
        throw new Error("malformed document_chunks owner row: document_id");
      }
      if (owner !== documentId) {
        throw new Error(
          `DocumentChunk.id (${chunk.id}) is already owned by a different document (${owner}) in this workspace`,
        );
      }
    }
  }

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
        throw new Error(
          `Duplicate DocumentChunk.id in replaceForDocument batch: ${chunk.id}`,
        );
      }
      seenIds.add(chunk.id);
      if (seenOrders.has(chunk.order)) {
        throw new Error(
          `Duplicate DocumentChunk.order in replaceForDocument batch: ${chunk.order}`,
        );
      }
      seenOrders.add(chunk.order);
      cloned.push(this.clone(chunk));
    }
    return cloned.sort((a, b) => a.order - b.order);
  }

  private mapRow(row: Readonly<Record<string, unknown>>): DocumentChunk {
    const order = row.order_index;
    if (typeof order !== "number" || !Number.isInteger(order)) {
      throw new Error("malformed document_chunks row: order_index");
    }
    const chunk: DocumentChunk = {
      workspaceId: this.requireString(row, "workspace_id"),
      id: this.requireString(row, "id"),
      documentId: this.requireString(row, "document_id"),
      text: this.requireString(row, "text"),
      order,
    };
    this.assertChunk(chunk);
    return this.clone(chunk);
  }

  private requireString(
    row: Readonly<Record<string, unknown>>,
    key: string,
  ): string {
    const value = row[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`malformed document_chunks row: ${key}`);
    }
    return value;
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
