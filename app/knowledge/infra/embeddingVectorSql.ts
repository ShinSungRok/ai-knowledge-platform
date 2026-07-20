/**
 * Canonical SQL for embedding_vectors rebuildable search-index access.
 *
 * Table: embedding_vectors(
 *   workspace_id TEXT, chunk_id TEXT, vector_json TEXT,
 *   PRIMARY KEY(workspace_id, chunk_id)
 * )
 *
 * `vector_json` is a JSON array of numbers. Dimension is enforced by
 * VectorIndex adapters (EMBEDDING_VECTOR_DIMENSION), not by SQL.
 */
export const SQL_UPSERT_EMBEDDING_VECTOR = `
INSERT INTO embedding_vectors (workspace_id, chunk_id, vector_json)
VALUES ($1, $2, $3)
ON CONFLICT (workspace_id, chunk_id) DO UPDATE SET
  vector_json = EXCLUDED.vector_json
`.trim();

export const SQL_SELECT_EMBEDDING_VECTOR_BY_CHUNK = `
SELECT workspace_id, chunk_id, vector_json
FROM embedding_vectors
WHERE workspace_id = $1 AND chunk_id = $2
`.trim();

export const SQL_DELETE_EMBEDDING_VECTOR = `
DELETE FROM embedding_vectors
WHERE workspace_id = $1 AND chunk_id = $2
`.trim();

export const SQL_SELECT_EMBEDDING_VECTORS_BY_WORKSPACE = `
SELECT workspace_id, chunk_id, vector_json
FROM embedding_vectors
WHERE workspace_id = $1
`.trim();
