import { applyKnowledgeSchema } from "./applyKnowledgeSchema";
import { InMemorySqlGateway } from "./InMemorySqlGateway";
import { KNOWLEDGE_MODULE_INFRA } from "./index";
import { SqlDocumentChunkRepository } from "../persistence/SqlDocumentChunkRepository";
import { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import { SqlKnowledgeSourceRepository } from "../persistence/SqlKnowledgeSourceRepository";

const WORKSPACE = "workspace-a";

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
  assertEqual(KNOWLEDGE_MODULE_INFRA, "app/knowledge/infra", "module constant");
}

async function assertSchemaApplyThenRepositorySmoke(): Promise<void> {
  console.log(
    "[infra] applyKnowledgeSchema then source/document/chunk save+find...",
  );
  const gateway = new InMemorySqlGateway();
  await applyKnowledgeSchema(gateway);
  await applyKnowledgeSchema(gateway);

  const sources = new SqlKnowledgeSourceRepository(gateway);
  const documents = new SqlKnowledgeDocumentRepository(gateway);
  const chunks = new SqlDocumentChunkRepository(gateway);

  await sources.save({
    workspaceId: WORKSPACE,
    id: "source-1",
    name: "Wiki",
  });
  assertEqual(
    (await sources.findById(WORKSPACE, "source-1"))?.name,
    "Wiki",
    "source",
  );

  await documents.save({
    workspaceId: WORKSPACE,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "body",
  });
  assertEqual(
    (await documents.findById(WORKSPACE, "doc-1"))?.title,
    "Title",
    "document",
  );

  await chunks.replaceForDocument(WORKSPACE, "doc-1", [
    {
      workspaceId: WORKSPACE,
      id: "chunk-1",
      documentId: "doc-1",
      text: "hello",
      order: 0,
    },
  ]);
  const found = await chunks.findByDocumentId(WORKSPACE, "doc-1");
  assertEqual(found.length, 1, "chunk count");
  assertEqual(found[0]!.text, "hello", "chunk text");
  assertTruthy(found[0]!.id === "chunk-1", "chunk id");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertSchemaApplyThenRepositorySmoke();
  console.log("Knowledge schema validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
