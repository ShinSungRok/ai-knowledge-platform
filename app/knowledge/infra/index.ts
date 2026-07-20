/**
 * Module: `app/knowledge/infra`
 *
 * Infrastructure edge for Source-of-Truth persistence and local Docker
 * scaffolding. Defines the {@link SqlGateway} contract (`execute` with
 * bound {@link SqlParameter}s returning {@link SqlQueryResult}) used by
 * SQL-backed repository adapters. Schema DDL lives in
 * `knowledgeSchemaSql` / `applyKnowledgeSchema`. Real `pg` drivers remain
 * deferred; validation uses an in-memory gateway (Sprint 21+).
 */
export const KNOWLEDGE_MODULE_INFRA = "app/knowledge/infra" as const;

export type { SqlParameter } from "./SqlParameter";
export type { SqlQueryResult } from "./SqlQueryResult";
export type { SqlGateway } from "./SqlGateway";
export { InMemorySqlGateway } from "./InMemorySqlGateway";
export { applyKnowledgeSchema } from "./applyKnowledgeSchema";
export {
  SQL_CREATE_KNOWLEDGE_SOURCES,
  SQL_CREATE_KNOWLEDGE_DOCUMENTS,
  SQL_CREATE_DOCUMENT_CHUNKS,
  KNOWLEDGE_SCHEMA_DDL,
} from "./knowledgeSchemaSql";
export {
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
  SQL_DELETE_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";
export {
  SQL_UPSERT_KNOWLEDGE_SOURCE,
  SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID,
} from "./knowledgeSourceSql";
export {
  SQL_SELECT_CHUNKS_BY_DOCUMENT,
  SQL_SELECT_CHUNK_BY_ID,
  SQL_SELECT_CHUNKS_BY_WORKSPACE,
  SQL_DELETE_CHUNKS_BY_DOCUMENT,
  SQL_INSERT_DOCUMENT_CHUNK,
  SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID,
} from "./documentChunkSql";
