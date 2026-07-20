import { applyKnowledgeSchema } from "./applyKnowledgeSchema";
import { FakePostgresPool } from "./FakePostgresPool";
import { KNOWLEDGE_MODULE_INFRA } from "./index";
import {
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";
import { PostgresSqlGateway } from "./PostgresSqlGateway";
import { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";

const WORKSPACE = "workspace-a";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertModuleConstant(): void {
  console.log("[infra] KNOWLEDGE_MODULE_INFRA constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_INFRA, "app/knowledge/infra", "module constant");
}

async function assertUpsertSelectRoundTrip(): Promise<void> {
  console.log(
    "[infra] PostgresSqlGateway upsert/select via FakePostgresPool...",
  );
  const pool = new FakePostgresPool();
  const gateway = new PostgresSqlGateway(pool);
  await gateway.execute(SQL_UPSERT_KNOWLEDGE_DOCUMENT, [
    WORKSPACE,
    "doc-1",
    "source-1",
    "Title",
    "body",
  ]);
  const found = await gateway.execute(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID, [
    WORKSPACE,
    "doc-1",
  ]);
  assertEqual(found.rowCount, 1, "rowCount");
  assertEqual(found.rows[0]!.title, "Title", "title");
  const originalTitle = found.rows[0]!.title;
  (found.rows[0] as Record<string, unknown>).title = "mutated";
  const again = await gateway.execute(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID, [
    WORKSPACE,
    "doc-1",
  ]);
  assertEqual(again.rows[0]!.title, originalTitle, "defensive copy");
}

async function assertSchemaAndRepositorySmoke(): Promise<void> {
  console.log(
    "[infra] applyKnowledgeSchema + SqlKnowledgeDocumentRepository via Fake pool...",
  );
  const gateway = new PostgresSqlGateway(new FakePostgresPool());
  await applyKnowledgeSchema(gateway);
  const repository = new SqlKnowledgeDocumentRepository(gateway);
  await repository.save({
    workspaceId: WORKSPACE,
    id: "doc-2",
    sourceId: "source-1",
    title: "Second",
    text: "text",
  });
  assertEqual(
    (await repository.findById(WORKSPACE, "doc-2"))?.title,
    "Second",
    "document",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertUpsertSelectRoundTrip();
  await assertSchemaAndRepositorySmoke();
  console.log("PostgresSqlGateway validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
