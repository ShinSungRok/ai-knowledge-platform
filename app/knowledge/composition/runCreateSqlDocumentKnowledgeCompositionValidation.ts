import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createSqlDocumentKnowledgeComposition } from "./createSqlDocumentKnowledgeComposition";
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
  composition: ReturnType<typeof createSqlDocumentKnowledgeComposition>,
): Promise<void> {
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
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

async function assertCitedAnswerViaSqlDocuments(): Promise<void> {
  console.log(
    "[composition] createSqlDocumentKnowledgeComposition returns cited answer via SQL document repo...",
  );
  const composition = createSqlDocumentKnowledgeComposition();
  await seed(composition);
  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  assertTruthy(result.answer.evidence.length > 0, "evidence present");
  assertTruthy(
    composition.knowledgeDocumentRepository.constructor.name ===
      "SqlKnowledgeDocumentRepository",
    "SQL document repository",
  );
  const stored = await composition.knowledgeDocumentRepository.findById(
    WORKSPACE_A,
    "doc-1",
  );
  assertEqual(stored?.title, "Title", "document from SQL repo");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertCitedAnswerViaSqlDocuments();
  console.log("createSqlDocumentKnowledgeComposition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
