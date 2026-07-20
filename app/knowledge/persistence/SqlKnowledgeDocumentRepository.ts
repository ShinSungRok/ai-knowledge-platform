import {
  SQL_DELETE_KNOWLEDGE_DOCUMENT,
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "../infra/knowledgeDocumentSql";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { SqlGateway } from "../infra/SqlGateway";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * SQL-backed {@link KnowledgeDocumentRepository} over a {@link SqlGateway}.
 *
 * Assumes table `knowledge_documents(workspace_id, id, source_id, title, text)`
 * with primary key `(workspace_id, id)`. Uses bound parameters only.
 */
export class SqlKnowledgeDocumentRepository
  implements KnowledgeDocumentRepository
{
  constructor(private readonly gateway: SqlGateway) {}

  async save(document: KnowledgeDocument): Promise<void> {
    this.assertDocument(document);
    const copy = this.clone(document);
    await this.gateway.execute(SQL_UPSERT_KNOWLEDGE_DOCUMENT, [
      copy.workspaceId,
      copy.id,
      copy.sourceId,
      copy.title,
      copy.text,
    ]);
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KnowledgeDocument | null> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    const result = await this.gateway.execute(
      SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
      [workspaceId, id],
    );
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]!);
  }

  async findAll(workspaceId: string): Promise<KnowledgeDocument[]> {
    this.assertWorkspaceId(workspaceId);
    const result = await this.gateway.execute(
      SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
      [workspaceId],
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async deleteById(workspaceId: string, id: string): Promise<void> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    await this.gateway.execute(SQL_DELETE_KNOWLEDGE_DOCUMENT, [
      workspaceId,
      id,
    ]);
  }

  private mapRow(row: Readonly<Record<string, unknown>>): KnowledgeDocument {
    const document: KnowledgeDocument = {
      workspaceId: this.requireString(row, "workspace_id"),
      id: this.requireString(row, "id"),
      sourceId: this.requireString(row, "source_id"),
      title: this.requireString(row, "title"),
      text: this.requireText(row, "text"),
    };
    this.assertDocument(document);
    return this.clone(document);
  }

  private requireString(
    row: Readonly<Record<string, unknown>>,
    key: string,
  ): string {
    const value = row[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`malformed knowledge_documents row: ${key}`);
    }
    return value;
  }

  private requireText(
    row: Readonly<Record<string, unknown>>,
    key: string,
  ): string {
    const value = row[key];
    if (typeof value !== "string") {
      throw new Error(`malformed knowledge_documents row: ${key}`);
    }
    return value;
  }

  private assertDocument(document: KnowledgeDocument): void {
    if (!document || typeof document !== "object") {
      throw new Error("KnowledgeDocument must be an object");
    }
    this.assertWorkspaceId(document.workspaceId);
    this.assertId(document.id);
    if (
      typeof document.sourceId !== "string" ||
      document.sourceId.trim().length === 0
    ) {
      throw new Error("KnowledgeDocument.sourceId must be a non-empty string");
    }
    if (
      typeof document.title !== "string" ||
      document.title.trim().length === 0
    ) {
      throw new Error("KnowledgeDocument.title must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("KnowledgeDocument.text must be a string");
    }
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      throw new Error("KnowledgeDocument.workspaceId must be a non-empty string");
    }
  }

  private assertId(id: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("KnowledgeDocument.id must be a non-empty string");
    }
  }

  private clone(document: KnowledgeDocument): KnowledgeDocument {
    return {
      workspaceId: document.workspaceId,
      id: document.id,
      sourceId: document.sourceId,
      title: document.title,
      text: document.text,
    };
  }
}
