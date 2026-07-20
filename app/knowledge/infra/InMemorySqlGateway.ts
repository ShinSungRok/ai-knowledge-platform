import type { SqlGateway } from "./SqlGateway";
import type { SqlParameter } from "./SqlParameter";
import type { SqlQueryResult } from "./SqlQueryResult";
import {
  SQL_DELETE_KNOWLEDGE_DOCUMENT,
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";

type DocumentRow = {
  workspace_id: string;
  id: string;
  source_id: string;
  title: string;
  text: string;
};

/**
 * In-memory {@link SqlGateway} that supports the
 * `knowledge_documents` SQL used by {@link SqlKnowledgeDocumentRepository}.
 * Unsupported SQL throws `"Unsupported SQL for InMemorySqlGateway"`.
 */
export class InMemorySqlGateway implements SqlGateway {
  private readonly documents = new Map<string, DocumentRow>();

  async execute(
    sql: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult> {
    const normalized = normalizeSql(sql);
    if (normalized === normalizeSql(SQL_UPSERT_KNOWLEDGE_DOCUMENT)) {
      return this.upsert(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID)) {
      return this.selectById(params);
    }
    if (
      normalized === normalizeSql(SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE)
    ) {
      return this.selectByWorkspace(params);
    }
    if (normalized === normalizeSql(SQL_DELETE_KNOWLEDGE_DOCUMENT)) {
      return this.deleteById(params);
    }
    throw new Error("Unsupported SQL for InMemorySqlGateway");
  }

  private upsert(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 5);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const sourceId = this.requireStringParam(params[2], "$3");
    const title = this.requireStringParam(params[3], "$4");
    const text = this.requireStringParamAllowEmpty(params[4], "$5");
    const key = this.key(workspaceId, id);
    this.documents.set(key, {
      workspace_id: workspaceId,
      id,
      source_id: sourceId,
      title,
      text,
    });
    return { rows: [], rowCount: 1 };
  }

  private selectById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const row = this.documents.get(this.key(workspaceId, id));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [this.cloneRow(row)], rowCount: 1 };
  }

  private selectByWorkspace(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 1);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const rows = [...this.documents.values()]
      .filter((row) => row.workspace_id === workspaceId)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((row) => this.cloneRow(row));
    return { rows, rowCount: rows.length };
  }

  private deleteById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const key = this.key(workspaceId, id);
    const existed = this.documents.delete(key);
    return { rows: [], rowCount: existed ? 1 : 0 };
  }

  private key(workspaceId: string, id: string): string {
    return `${workspaceId}\0${id}`;
  }

  private cloneRow(row: DocumentRow): DocumentRow {
    return {
      workspace_id: row.workspace_id,
      id: row.id,
      source_id: row.source_id,
      title: row.title,
      text: row.text,
    };
  }

  private assertParamCount(
    params: readonly SqlParameter[],
    expected: number,
  ): void {
    if (params.length !== expected) {
      throw new Error(
        `InMemorySqlGateway expected ${expected} params, got ${params.length}`,
      );
    }
  }

  private requireStringParam(
    value: SqlParameter | undefined,
    label: string,
  ): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`InMemorySqlGateway ${label} must be a non-empty string`);
    }
    return value;
  }

  private requireStringParamAllowEmpty(
    value: SqlParameter | undefined,
    label: string,
  ): string {
    if (typeof value !== "string") {
      throw new Error(`InMemorySqlGateway ${label} must be a string`);
    }
    return value;
  }
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}
