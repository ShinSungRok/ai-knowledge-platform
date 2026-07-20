/**
 * Optional live Postgres smoke. Skips (exit 0) when DATABASE_URL is unset.
 * Not included in top-level `pnpm validate`.
 */
import { Pool } from "pg";
import { applyKnowledgeSchema } from "./applyKnowledgeSchema";
import { PostgresSqlGateway } from "./PostgresSqlGateway";
import {
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    console.log(
      "[infra:postgres-live] DATABASE_URL unset; skipping live Postgres smoke.",
    );
    return;
  }

  console.log("[infra:postgres-live] Connecting via DATABASE_URL...");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const gateway = new PostgresSqlGateway(pool);
    await applyKnowledgeSchema(gateway);
    await gateway.execute(SQL_UPSERT_KNOWLEDGE_DOCUMENT, [
      "workspace-live",
      "doc-live",
      "source-live",
      "Live Title",
      "live body",
    ]);
    const found = await gateway.execute(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID, [
      "workspace-live",
      "doc-live",
    ]);
    if (found.rowCount !== 1 || found.rows[0]?.title !== "Live Title") {
      throw new Error("Live Postgres smoke failed: unexpected select result");
    }
    console.log("Postgres live smoke succeeded.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
