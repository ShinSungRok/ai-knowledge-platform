/**
 * Canonical SQL for document_chunks Source-of-Truth access.
 *
 * Table: document_chunks(
 *   workspace_id TEXT, id TEXT, document_id TEXT, source_id TEXT,
 *   order_index INTEGER, text TEXT,
 *   PRIMARY KEY(workspace_id, id)
 * )
 *
 * `source_id` is stored for schema compatibility; domain `DocumentChunk`
 * does not carry it — adapters write an empty string.
 */
export const SQL_SELECT_CHUNKS_BY_DOCUMENT = `
SELECT workspace_id, id, document_id, source_id, order_index, text
FROM document_chunks
WHERE workspace_id = $1 AND document_id = $2
ORDER BY order_index ASC, id ASC
`.trim();

export const SQL_SELECT_CHUNK_BY_ID = `
SELECT workspace_id, id, document_id, source_id, order_index, text
FROM document_chunks
WHERE workspace_id = $1 AND id = $2
`.trim();

export const SQL_SELECT_CHUNKS_BY_WORKSPACE = `
SELECT workspace_id, id, document_id, source_id, order_index, text
FROM document_chunks
WHERE workspace_id = $1
ORDER BY document_id ASC, order_index ASC, id ASC
`.trim();

export const SQL_DELETE_CHUNKS_BY_DOCUMENT = `
DELETE FROM document_chunks
WHERE workspace_id = $1 AND document_id = $2
`.trim();

export const SQL_INSERT_DOCUMENT_CHUNK = `
INSERT INTO document_chunks (workspace_id, id, document_id, source_id, order_index, text)
VALUES ($1, $2, $3, $4, $5, $6)
`.trim();

export const SQL_SELECT_CHUNK_OWNER_DOCUMENT_ID = `
SELECT document_id
FROM document_chunks
WHERE workspace_id = $1 AND id = $2
`.trim();
