/**
 * Module: `app/knowledge/infra`
 *
 * Infrastructure edge for Source-of-Truth persistence and local Docker
 * scaffolding. Defines the {@link SqlGateway} contract (`execute` with
 * bound {@link SqlParameter}s returning {@link SqlQueryResult}) used by
 * SQL-backed repository adapters. Real `pg` / ORM drivers remain deferred;
 * validation uses an in-memory gateway (Sprint 21+).
 */
export const KNOWLEDGE_MODULE_INFRA = "app/knowledge/infra" as const;

export type { SqlParameter } from "./SqlParameter";
export type { SqlQueryResult } from "./SqlQueryResult";
export type { SqlGateway } from "./SqlGateway";
export {
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE,
  SQL_DELETE_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";
