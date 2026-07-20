/**
 * Canonical SQL for knowledge_sources Source-of-Truth access.
 *
 * Table: knowledge_sources(
 *   workspace_id TEXT, id TEXT, name TEXT,
 *   PRIMARY KEY(workspace_id, id)
 * )
 */
export const SQL_UPSERT_KNOWLEDGE_SOURCE = `
INSERT INTO knowledge_sources (workspace_id, id, name)
VALUES ($1, $2, $3)
ON CONFLICT (workspace_id, id) DO UPDATE SET
  name = EXCLUDED.name
`.trim();

export const SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID = `
SELECT workspace_id, id, name
FROM knowledge_sources
WHERE workspace_id = $1 AND id = $2
`.trim();
