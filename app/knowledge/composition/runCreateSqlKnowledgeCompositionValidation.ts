import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createSqlKnowledgeComposition } from "./createSqlKnowledgeComposition";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

const WORKSPACE_A = "workspace-a";

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

async function seed(
  composition: ReturnType<typeof createSqlKnowledgeComposition>,
): Promise<void> {
  const source: KnowledgeSource = {
    workspaceId: WORKSPACE_A,
    id: "source-1",
    name: "Internal Wiki",
  };
  await composition.knowledgeSourceRepository.save(source);

  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: source.id,
    title: "Title",
    text: "document text",
  };
  await composition.knowledgeDocumentRepository.save(document);

  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: document.id,
    text: "aaaaaaaa",
    order: 0,
  };
  await composition.documentChunkRepository.replaceForDocument(
    WORKSPACE_A,
    document.id,
    [chunk],
  );

  const embeddingProvider = new FakeEmbeddingProvider();
  const vector = await embeddingProvider.embed(chunk.text);
  await composition.vectorIndex.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: chunk.id,
    vector,
  });
}

function assertModuleConstant(): void {
  console.log(
    "[composition] KNOWLEDGE_MODULE_COMPOSITION constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_COMPOSITION,
    "app/knowledge/composition",
    "module constant",
  );
}

async function assertEndToEndSqlPath(): Promise<void> {
  console.log(
    "[composition] createSqlKnowledgeComposition source→document→chunk→cited-answer...",
  );
  const composition = createSqlKnowledgeComposition();
  await seed(composition);

  assertTruthy(
    composition.knowledgeSourceRepository.constructor.name ===
      "SqlKnowledgeSourceRepository",
    "SQL source repository",
  );
  assertTruthy(
    composition.knowledgeDocumentRepository.constructor.name ===
      "SqlKnowledgeDocumentRepository",
    "SQL document repository",
  );
  assertTruthy(
    composition.documentChunkRepository.constructor.name ===
      "SqlDocumentChunkRepository",
    "SQL chunk repository",
  );
  assertTruthy(
    composition.vectorIndex.constructor.name === "SqlVectorIndex",
    "SQL vector index",
  );
  assertEqual(
    composition.sqlGateway.constructor.name,
    "InMemorySqlGateway",
    "shared gateway",
  );

  const storedSource = await composition.knowledgeSourceRepository.findById(
    WORKSPACE_A,
    "source-1",
  );
  assertEqual(storedSource?.name, "Internal Wiki", "source from SQL");

  const storedDoc = await composition.knowledgeDocumentRepository.findById(
    WORKSPACE_A,
    "doc-1",
  );
  assertEqual(storedDoc?.sourceId, "source-1", "document from SQL");

  const storedChunks =
    await composition.documentChunkRepository.findByDocumentId(
      WORKSPACE_A,
      "doc-1",
    );
  assertEqual(storedChunks.length, 1, "chunk count");
  assertEqual(storedChunks[0]!.text, "aaaaaaaa", "chunk from SQL");

  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  assertTruthy(result.answer.evidence.length > 0, "evidence present");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertEndToEndSqlPath();
  console.log("createSqlKnowledgeComposition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
