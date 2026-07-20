import { InMemorySqlGateway } from "./InMemorySqlGateway";
import { KNOWLEDGE_MODULE_INFRA } from "./index";
import {
  SQL_INSERT_DOCUMENT_CHUNK,
  SQL_SELECT_CHUNKS_BY_DOCUMENT,
} from "./documentChunkSql";
import {
  SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID,
  SQL_UPSERT_KNOWLEDGE_DOCUMENT,
} from "./knowledgeDocumentSql";
import {
  SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID,
  SQL_UPSERT_KNOWLEDGE_SOURCE,
} from "./knowledgeSourceSql";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertModuleConstant(): void {
  console.log("[infra] KNOWLEDGE_MODULE_INFRA constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_INFRA,
    "app/knowledge/infra",
    "module constant",
  );
}

async function assertSupportedSqlRoundTrip(): Promise<void> {
  console.log(
    "[infra] InMemorySqlGateway upserts and selects knowledge_documents rows...",
  );
  const gateway = new InMemorySqlGateway();
  await gateway.execute(SQL_UPSERT_KNOWLEDGE_DOCUMENT, [
    "workspace-a",
    "doc-1",
    "source-1",
    "Title",
    "body",
  ]);
  const found = await gateway.execute(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID, [
    "workspace-a",
    "doc-1",
  ]);
  assertEqual(found.rowCount, 1, "rowCount");
  assertEqual(found.rows[0]!.title, "Title", "title");
}

async function assertSourceAndChunkSqlRoundTrip(): Promise<void> {
  console.log(
    "[infra] InMemorySqlGateway upserts sources and inserts chunks...",
  );
  const gateway = new InMemorySqlGateway();
  await gateway.execute(SQL_UPSERT_KNOWLEDGE_SOURCE, [
    "workspace-a",
    "source-1",
    "Wiki",
  ]);
  const source = await gateway.execute(SQL_SELECT_KNOWLEDGE_SOURCE_BY_ID, [
    "workspace-a",
    "source-1",
  ]);
  assertEqual(source.rows[0]!.name, "Wiki", "source name");
  await gateway.execute(SQL_INSERT_DOCUMENT_CHUNK, [
    "workspace-a",
    "chunk-1",
    "doc-1",
    "",
    0,
    "hello",
  ]);
  const chunks = await gateway.execute(SQL_SELECT_CHUNKS_BY_DOCUMENT, [
    "workspace-a",
    "doc-1",
  ]);
  assertEqual(chunks.rowCount, 1, "chunk rowCount");
  assertEqual(chunks.rows[0]!.text, "hello", "chunk text");
}

async function assertUnsupportedSqlThrows(): Promise<void> {
  console.log(
    "[infra] InMemorySqlGateway rejects unsupported SQL...",
  );
  const gateway = new InMemorySqlGateway();
  let caught: unknown;
  try {
    await gateway.execute("SELECT * FROM other_table", []);
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw");
  assertEqual(
    (caught as Error).message,
    "Unsupported SQL for InMemorySqlGateway",
    "error message",
  );
}

async function assertParamMismatchThrows(): Promise<void> {
  console.log(
    "[infra] InMemorySqlGateway rejects wrong param counts...",
  );
  const gateway = new InMemorySqlGateway();
  let caught: unknown;
  try {
    await gateway.execute(SQL_SELECT_KNOWLEDGE_DOCUMENT_BY_ID, ["only-one"]);
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw");
  assertTruthy(
    (caught as Error).message.includes("expected 2 params"),
    "param count message",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertSupportedSqlRoundTrip();
  await assertSourceAndChunkSqlRoundTrip();
  await assertUnsupportedSqlThrows();
  await assertParamMismatchThrows();
  console.log("InMemorySqlGateway validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
