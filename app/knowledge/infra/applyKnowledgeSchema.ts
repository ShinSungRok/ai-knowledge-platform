import type { SqlGateway } from "./SqlGateway";
import { KNOWLEDGE_SCHEMA_DDL } from "./knowledgeSchemaSql";

/**
 * Applies knowledge Source-of-Truth schema DDL through a {@link SqlGateway}.
 *
 * Executes CREATE TABLE IF NOT EXISTS statements in order (sources →
 * documents → chunks → embedding_vectors). Safe to re-apply.
 */
export async function applyKnowledgeSchema(
  gateway: SqlGateway,
): Promise<void> {
  for (const sql of KNOWLEDGE_SCHEMA_DDL) {
    await gateway.execute(sql);
  }
}
