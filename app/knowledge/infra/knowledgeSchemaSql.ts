/**
 * Canonical DDL for knowledge Source-of-Truth tables and rebuildable
 * search-index persistence (`embedding_vectors`).
 *
 * SoT columns/PKs match repository SQL constants. `embedding_vectors`
 * stores JSON-serialized embedding arrays for {@link VectorIndex}
 * rebuild; OpenSearch remains deferred. Use {@link applyKnowledgeSchema}.
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

/**
 * Rebuildable search-index table (not document SoT).
 * Dimension is enforced by VectorIndex adapters via EMBEDDING_VECTOR_DIMENSION.
 */
export const SQL_CREATE_EMBEDDING_VECTORS = `
CREATE TABLE IF NOT EXISTS embedding_vectors (
  workspace_id TEXT NOT NULL,
  chunk_id TEXT NOT NULL,
  vector_json TEXT NOT NULL,
  PRIMARY KEY (workspace_id, chunk_id)
)
`.trim();

/** Ordered DDL statements for {@link applyKnowledgeSchema}. */
export const KNOWLEDGE_SCHEMA_DDL = [
  SQL_CREATE_KNOWLEDGE_SOURCES,
  SQL_CREATE_KNOWLEDGE_DOCUMENTS,
  SQL_CREATE_DOCUMENT_CHUNKS,
  SQL_CREATE_EMBEDDING_VECTORS,
] as const;
