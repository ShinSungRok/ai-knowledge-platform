import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_KNOWLEDGE_RUNTIME_CONFIG } from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
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
  composition: ReturnType<typeof createInMemoryKnowledgeComposition>,
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
    "unexpected module constant",
  );
}

async function assertCitedAnswerPath(): Promise<void> {
  console.log(
    "[composition] in-memory composition returns a cited answer for seeded data...",
  );
  const composition = createInMemoryKnowledgeComposition();
  await seed(composition);
  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  assertTruthy(result.answer.evidence.length > 0, "expected evidence");
  assertEqual(
    result.citations.length,
    result.answer.evidence.length,
    "citations match evidence",
  );
}

async function assertDefaultConfigApplied(): Promise<void> {
  console.log(
    "[composition] createInMemoryKnowledgeComposition applies default config...",
  );
  const composition = createInMemoryKnowledgeComposition();
  assertEqual(
    composition.runtime.config.defaultRetrievalLimit,
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.defaultRetrievalLimit,
    "default retrieval limit",
  );
  assertEqual(
    composition.runtime.config.defaultMaxCharacters,
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.defaultMaxCharacters,
    "default max characters",
  );
}

async function assertOptionalLimitFallback(): Promise<void> {
  console.log(
    "[composition] generateCitedGroundedAnswer fills missing limits from config...",
  );
  const composition = createInMemoryKnowledgeComposition({
    defaultRetrievalLimit: 3,
    defaultMaxCharacters: 500,
    defaultToolTimeoutMs: 1000,
    maxChunkLength: 200,
  });
  await seed(composition);
  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
  });
  assertTruthy(typeof result.answer.text === "string", "answer text present");
  assertEqual(
    composition.runtime.config.defaultRetrievalLimit,
    3,
    "custom config retained",
  );
}

function assertApplicationDoesNotImportCompositionAdapters(): void {
  console.log(
    "[composition] application/domain modules do not import composition concrete adapters...",
  );
  const forbiddenFiles = [
    "app/knowledge/application/GenerateCitedGroundedAnswerUseCase.ts",
    "app/knowledge/application/GenerateGroundedAnswerUseCase.ts",
    "app/knowledge/domain/KnowledgeDocument.ts",
  ];
  const forbidden = [
    "createInMemoryKnowledgeComposition",
    "InMemoryKnowledgeComposition",
    "../composition/",
  ];
  for (const relative of forbiddenFiles) {
    const source = readFileSync(path.resolve(process.cwd(), relative), "utf8");
    for (const reference of forbidden) {
      assertTruthy(
        !source.includes(reference),
        `${relative} must not reference "${reference}"`,
      );
    }
  }
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertCitedAnswerPath();
  await assertDefaultConfigApplied();
  await assertOptionalLimitFallback();
  assertApplicationDoesNotImportCompositionAdapters();
  console.log("InMemoryKnowledgeComposition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
