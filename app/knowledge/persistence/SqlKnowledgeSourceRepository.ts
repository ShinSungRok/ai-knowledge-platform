import type { KnowledgeSource } from "../domain/KnowledgeSource";
import type { SqlGateway } from "../infra/SqlGateway";
import {
  SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID,
  SQL_UPSERT_KNOWLEDGE_SOURCE,
} from "../infra/knowledgeSourceSql";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/**
 * SQL-backed {@link KnowledgeSourceRepository} over a {@link SqlGateway}.
 *
 * Assumes table `knowledge_sources(workspace_id, id, name)` with primary key
 * `(workspace_id, id)`. Uses bound parameters only.
 */
export class SqlKnowledgeSourceRepository
  implements KnowledgeSourceRepository
{
  constructor(private readonly gateway: SqlGateway) {}

  async save(source: KnowledgeSource): Promise<void> {
    this.assertSource(source);
    const copy = this.clone(source);
    await this.gateway.execute(SQL_UPSERT_KNOWLEDGE_SOURCE, [
      copy.workspaceId,
      copy.id,
      copy.name,
    ]);
  }

  async findById(
    workspaceId: string,
    id: string,
  ): Promise<KnowledgeSource | null> {
    this.assertWorkspaceId(workspaceId);
    this.assertId(id);
    const result = await this.gateway.execute(SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID, [
      workspaceId,
      id,
    ]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRow(result.rows[0]!);
  }

  private mapRow(row: Readonly<Record<string, unknown>>): KnowledgeSource {
    const source: KnowledgeSource = {
      workspaceId: this.requireString(row, "workspace_id"),
      id: this.requireString(row, "id"),
      name: this.requireString(row, "name"),
    };
    this.assertSource(source);
    return this.clone(source);
  }

  private requireString(
    row: Readonly<Record<string, unknown>>,
    key: string,
  ): string {
    const value = row[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`malformed knowledge_sources row: ${key}`);
    }
    return value;
  }

  private assertSource(source: KnowledgeSource): void {
    if (!source || typeof source !== "object") {
      throw new Error("KnowledgeSource must be an object");
    }
    this.assertWorkspaceId(source.workspaceId);
    this.assertId(source.id);
    if (typeof source.name !== "string" || source.name.trim().length === 0) {
      throw new Error("KnowledgeSource.name must be a non-empty string");
    }
  }

  private assertWorkspaceId(workspaceId: string): void {
    if (typeof workspaceId !== "string" || workspaceId.trim().length === 0) {
      throw new Error("KnowledgeSource.workspaceId must be a non-empty string");
    }
  }

  private assertId(id: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("KnowledgeSource.id must be a non-empty string");
    }
  }

  private clone(source: KnowledgeSource): KnowledgeSource {
    return {
      workspaceId: source.workspaceId,
      id: source.id,
      name: source.name,
    };
  }
}
