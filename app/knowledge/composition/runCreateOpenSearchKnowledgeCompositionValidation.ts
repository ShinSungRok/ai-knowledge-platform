import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeSource } from "../domain/KnowledgeSource";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createOpenSearchKnowledgeComposition } from "./createOpenSearchKnowledgeComposition";
import { createFakeOpenSearchOption } from "./createOpenSearchVectorIndexFromEnv";
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

async function main(): Promise<void> {
  console.log(
    "[composition] KNOWLEDGE_MODULE_COMPOSITION constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_COMPOSITION,
    "app/knowledge/composition",
    "module constant",
  );

  console.log(
    "[composition] createOpenSearchKnowledgeComposition SQL SoT + OpenSearch VectorIndex cited-answer...",
  );
  const composition = createOpenSearchKnowledgeComposition(undefined, {
    openSearch: createFakeOpenSearchOption(),
  });

  assertEqual(
    composition.vectorIndex.constructor.name,
    "OpenSearchVectorIndex",
    "OpenSearch vector index",
  );
  assertEqual(
    composition.sqlGateway.constructor.name,
    "InMemorySqlGateway",
    "SQL SoT gateway",
  );

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

  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  assertTruthy(result.answer.evidence.length > 0, "evidence present");
  console.log("createOpenSearchKnowledgeComposition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
