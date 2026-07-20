/**
 * Canonical SQL statements for knowledge_documents Source-of-Truth access.
 *
 * Table: knowledge_documents(
 *   workspace_id TEXT, id TEXT, source_id TEXT, title TEXT, text TEXT,
 *   PRIMARY KEY(workspace_id, id)
 * )
 *
 * Parameters are positional ($1..$n). Never concatenate user input into SQL.
 */
export const SQL_UPSERT_KNOWLEDGE_DOCUMENT = `
INSERT INTO knowledge_documents (workspace_id, id, source_id, title, text)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (workspace_id, id) DO UPDATE SET
  source_id = EXCLUDED.source_id,
  title = EXCLUDED.title,
  text = EXCLUDED.text
`.trim();

export const SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID = `
SELECT workspace_id, id, source_id, title, text
FROM knowledge_documents
WHERE workspace_id = $1 AND id = $2
`.trim();

export const SQL_SELECT_KNOWLEDGE_DOCUMENTS_BY_WORKSPACE = `
SELECT workspace_id, id, source_id, title, text
FROM knowledge_documents
WHERE workspace_id = $1
ORDER BY id ASC
`.trim();

export const SQL_DELETE_KNOWLEDGE_DOCUMENT = `
DELETE FROM knowledge_documents
WHERE workspace_id = $1 AND id = $2
`.trim();
