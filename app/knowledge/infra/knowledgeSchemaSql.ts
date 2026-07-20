/**
 * Canonical DDL for knowledge Source-of-Truth tables.
 *
 * Columns and primary keys match repository SQL constants in
 * `knowledgeSourceSql`, `knowledgeDocumentSql`, and `documentChunkSql`.
 * Use {@link applyKnowledgeSchema} to apply via a {@link SqlGateway}.
 */
export const SQL_CREATE_KNOWLEDGE_SOURCES = `
CREATE TABLE IF NOT EXISTS knowledge_sources (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
)
`.trim();

export const SQL_CREATE_KNOWLEDGE_DOCUMENTS = `
CREATE TABLE IF NOT EXISTS knowledge_documents (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
)
`.trim();

export const SQL_CREATE_DOCUMENT_CHUNKS = `
CREATE TABLE IF NOT EXISTS document_chunks (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  PRIMARY KEY (workspace_id, id)
)
`.trim();

/** Ordered DDL statements for {@link applyKnowledgeSchema}. */
export const KNOWLEDGE_SCHEMA_DDL = [
  SQL_CREATE_KNOWLEDGE_SOURCES,
  SQL_CREATE_KNOWLEDGE_DOCUMENTS,
  SQL_CREATE_DOCUMENT_CHUNKS,
] as const;
