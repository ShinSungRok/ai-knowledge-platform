import type { SqlGateway } from "./SqlGateway";
import type { SqlParameter } from "./SqlParameter";
import type { SqlQueryResult } from "./SqlQueryResult";
import {
  SQL_DELETE_CHUNKS_BY_DOCUMENT,
  SQL_INSERT_DOCUMENT_CHUNK,
  SQL_SELECT_CHUNK_BY_ID,
  SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID,
  SQL_SELECT_CHUNKS_BY_DOCUMENT,
  SQL_SELECT_CHUNKS_BY_WORKSPACE,
} from "./documentChunkSql";
import {
  SQL_DELETE_KNOWLEDGE_DOCUMENT,
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";
import {
  SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID,
  SQL_UPSERT_KNOWLEDGE_SOURCE,
} from "./knowledgeSourceSql";
import {
  SQL_DELETE_EMBEDDING_VECTOR,
  SQL_SELECT_EMBEDDING_VECTOR_BY_CHUNK,
  SQL_SELECT_EMBEDDING_VECTORS_BY_WORKSPACE,
  SQL_UPSERT_EMBEDDING_VECTOR,
} from "./embeddingVectorSql";
import {
  SQL_CREATE_DOCUMENT_CHUNKS,
  SQL_CREATE_EMBEDDING_VECTORS,
  SQL_CREATE_KNOWLEDGE_DOCUMENTS,
  SQL_CREATE_KNOWLEDGE_SOURCES,
} from "./knowledgeSchemaSql";

type DocumentRow = {
  workspace_id: string;
  id: string;
  source_id: string;
  title: string;
  text: string;
};

type SourceRow = {
  workspace_id: string;
  id: string;
  name: string;
};

type ChunkRow = {
  workspace_id: string;
  id: string;
  document_id: string;
  source_id: string;
  order_index: number;
  text: string;
};

type EmbeddingRow = {
  workspace_id: string;
  chunk_id: string;
  vector_json: string;
};

/**
 * In-memory {@link SqlGateway} supporting knowledge_documents,
 * knowledge_sources, document_chunks, and embedding_vectors SQL constants
 * used by SQL repository / vector index adapters. Schema DDL from
 * {@link knowledgeSchemaSql} is a no-op. Unsupported SQL throws
 * `"Unsupported SQL for InMemorySqlGateway"`.
 */
export class InMemorySqlGateway implements SqlGateway {
  private readonly documents = new Map<string, DocumentRow>();
  private readonly sources = new Map<string, SourceRow>();
  private readonly chunks = new Map<string, ChunkRow>();
  private readonly embeddings = new Map<string, EmbeddingRow>();

  async execute(
    sql: string,
    params: readonly SqlParameter[] = [],
  ): Promise<SqlQueryResult> {
    const normalized = normalizeSql(sql);

    if (
      normalized === normalizeSql(SQL_CREATE_KNOWLEDGE_SOURCES) ||
      normalized === normalizeSql(SQL_CREATE_KNOWLEDGE_DOCUMENTS) ||
      normalized === normalizeSql(SQL_CREATE_DOCUMENT_CHUNKS) ||
      normalized === normalizeSql(SQL_CREATE_EMBEDDING_VECTORS)
    ) {
      return { rows: [], rowCount: 0 };
    }

    if (normalized === normalizeSql(SQL_UPSERT_KNOWLEDGE_DOCUMENT)) {
      return this.upsertDocument(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID)) {
      return this.selectDocumentById(params);
    }
    if (
      normalized === normalizeSql(SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE)
    ) {
      return this.selectDocumentsByWorkspace(params);
    }
    if (normalized === normalizeSql(SQL_DELETE_KNOWLEDGE_DOCUMENT)) {
      return this.deleteDocumentById(params);
    }

    if (normalized === normalizeSql(SQL_UPSERT_KNOWLEDGE_SOURCE)) {
      return this.upsertSource(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID)) {
      return this.selectSourceById(params);
    }

    if (normalized === normalizeSql(SQL_SELECT_CHUNKS_BY_DOCUMENT)) {
      return this.selectChunksByDocument(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_CHUNK_BY_ID)) {
      return this.selectChunkById(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_CHUNKS_BY_WORKSPACE)) {
      return this.selectChunksByWorkspace(params);
    }
    if (normalized === normalizeSql(SQL_DELETE_CHUNKS_BY_DOCUMENT)) {
      return this.deleteChunksByDocument(params);
    }
    if (normalized === normalizeSql(SQL_INSERT_DOCUMENT_CHUNK)) {
      return this.insertChunk(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID)) {
      return this.selectChunkOwner(params);
    }

    if (normalized === normalizeSql(SQL_UPSERT_EMBEDDING_VECTOR)) {
      return this.upsertEmbedding(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_EMBEDDING_VECTOR_BY_CHUNK)) {
      return this.selectEmbeddingByChunk(params);
    }
    if (normalized === normalizeSql(SQL_DELETE_EMBEDDING_VECTOR)) {
      return this.deleteEmbedding(params);
    }
    if (normalized === normalizeSql(SQL_SELECT_EMBEDDING_VECTORS_BY_WORKSPACE)) {
      return this.selectEmbeddingsByWorkspace(params);
    }

    throw new Error("Unsupported SQL for InMemorySqlGateway");
  }

  private upsertDocument(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 5);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const sourceId = this.requireStringParam(params[2], "$3");
    const title = this.requireStringParam(params[3], "$4");
    const text = this.requireStringParamAllowEmpty(params[4], "$5");
    this.documents.set(this.key(workspaceId, id), {
      workspace_id: workspaceId,
      id,
      source_id: sourceId,
      title,
      text,
    });
    return { rows: [], rowCount: 1 };
  }

  private selectDocumentById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const row = this.documents.get(this.key(workspaceId, id));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [{ ...row }], rowCount: 1 };
  }

  private selectDocumentsByWorkspace(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 1);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const rows = [...this.documents.values()]
      .filter((row) => row.workspace_id === workspaceId)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((row) => ({ ...row }));
    return { rows, rowCount: rows.length };
  }

  private deleteDocumentById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const existed = this.documents.delete(this.key(workspaceId, id));
    return { rows: [], rowCount: existed ? 1 : 0 };
  }

  private upsertSource(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 3);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const name = this.requireStringParam(params[2], "$3");
    this.sources.set(this.key(workspaceId, id), {
      workspace_id: workspaceId,
      id,
      name,
    });
    return { rows: [], rowCount: 1 };
  }

  private selectSourceById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const row = this.sources.get(this.key(workspaceId, id));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [{ ...row }], rowCount: 1 };
  }

  private selectChunksByDocument(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const documentId = this.requireStringParam(params[1], "$2");
    const rows = [...this.chunks.values()]
      .filter(
        (row) =>
          row.workspace_id === workspaceId && row.document_id === documentId,
      )
      .sort((a, b) => {
        if (a.order_index !== b.order_index) {
          return a.order_index - b.order_index;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((row) => ({ ...row }));
    return { rows, rowCount: rows.length };
  }

  private selectChunkById(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const row = this.chunks.get(this.key(workspaceId, id));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [{ ...row }], rowCount: 1 };
  }

  private selectChunksByWorkspace(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 1);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const rows = [...this.chunks.values()]
      .filter((row) => row.workspace_id === workspaceId)
      .sort((a, b) => {
        if (a.document_id !== b.document_id) {
          return a.document_id < b.document_id ? -1 : 1;
        }
        if (a.order_index !== b.order_index) {
          return a.order_index - b.order_index;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      })
      .map((row) => ({ ...row }));
    return { rows, rowCount: rows.length };
  }

  private deleteChunksByDocument(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const documentId = this.requireStringParam(params[1], "$2");
    let deleted = 0;
    for (const [key, row] of [...this.chunks.entries()]) {
      if (row.workspace_id === workspaceId && row.document_id === documentId) {
        this.chunks.delete(key);
        deleted += 1;
      }
    }
    return { rows: [], rowCount: deleted };
  }

  private insertChunk(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 6);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const documentId = this.requireStringParam(params[2], "$3");
    const sourceId = this.requireStringParamAllowEmpty(params[3], "$4");
    const orderIndex = params[4];
    if (typeof orderIndex !== "number" || !Number.isInteger(orderIndex)) {
      throw new Error("InMemorySqlGateway $5 must be an integer");
    }
    const text = this.requireStringParam(params[5], "$6");
    this.chunks.set(this.key(workspaceId, id), {
      workspace_id: workspaceId,
      id,
      document_id: documentId,
      source_id: sourceId,
      order_index: orderIndex,
      text,
    });
    return { rows: [], rowCount: 1 };
  }

  private selectChunkOwner(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const id = this.requireStringParam(params[1], "$2");
    const row = this.chunks.get(this.key(workspaceId, id));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return {
      rows: [{ document_id: row.document_id }],
      rowCount: 1,
    };
  }

  private upsertEmbedding(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 3);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const chunkId = this.requireStringParam(params[1], "$2");
    const vectorJson = this.requireStringParam(params[2], "$3");
    this.embeddings.set(this.key(workspaceId, chunkId), {
      workspace_id: workspaceId,
      chunk_id: chunkId,
      vector_json: vectorJson,
    });
    return { rows: [], rowCount: 1 };
  }

  private selectEmbeddingByChunk(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const chunkId = this.requireStringParam(params[1], "$2");
    const row = this.embeddings.get(this.key(workspaceId, chunkId));
    if (!row) {
      return { rows: [], rowCount: 0 };
    }
    return { rows: [{ ...row }], rowCount: 1 };
  }

  private deleteEmbedding(params: readonly SqlParameter[]): SqlQueryResult {
    this.assertParamCount(params, 2);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const chunkId = this.requireStringParam(params[1], "$2");
    const existed = this.embeddings.delete(this.key(workspaceId, chunkId));
    return { rows: [], rowCount: existed ? 1 : 0 };
  }

  private selectEmbeddingsByWorkspace(
    params: readonly SqlParameter[],
  ): SqlQueryResult {
    this.assertParamCount(params, 1);
    const workspaceId = this.requireStringParam(params[0], "$1");
    const rows = [...this.embeddings.values()]
      .filter((row) => row.workspace_id === workspaceId)
      .map((row) => ({ ...row }));
    return { rows, rowCount: rows.length };
  }

  private key(workspaceId: string, id: string): string {
    return `${workspaceId}\0${id}`;
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
