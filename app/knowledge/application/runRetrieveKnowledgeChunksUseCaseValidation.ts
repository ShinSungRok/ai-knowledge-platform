import { readFileSync } from "node:fs";
import path from "node:path";

import {
  RetrieveKnowledgeChunksUseCase,
  type RetrieveKnowledgeChunksInput,
} from "./RetrieveKnowledgeChunksUseCase";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { VectorRetriever } from "../retrieval/VectorRetriever";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { DocumentChunk } from "../domain/DocumentChunk";

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

function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  return promise.then(
    () => {
      throw new Error(`Expected rejection containing: ${messageSubstring}`);
    },
    (error: unknown) => {
      const text = error instanceof Error ? error.message : String(error);
      assertTruthy(
        text.includes(messageSubstring),
        `Expected error message to include "${messageSubstring}", got: ${text}`,
      );
    },
  );
}

/** Counts calls and records the last input, delegating to a real retriever. */
class CountingVectorRetriever implements VectorRetriever {
  public retrieveCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(private readonly inner: VectorRetriever) {}

  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    this.retrieveCalls += 1;
    this.lastInput = input;
    return this.inner.retrieve(input);
  }
}

function assertDependsOnlyOnVectorRetrieverPort(): void {
  console.log("[application] RetrieveKnowledgeChunksUseCase depends only on the VectorRetriever port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RetrieveKnowledgeChunksUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../retrieval/VectorRetriever"'),
    "Use case must import the VectorRetriever port",
  );
  const forbiddenReferences = [
    "DefaultVectorRetriever",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "../embedding/",
    "../persistence/",
    "../repository/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RetrieveKnowledgeChunksUseCase.ts must not reference "${reference}"`,
    );
  }
}

function buildRealVectorRetriever(): DefaultVectorRetriever {
  return new DefaultVectorRetriever(
    new FakeEmbeddingProvider(),
    new InMemoryVectorIndex(),
    new DefaultInMemoryDocumentChunkRepository(),
  );
}

async function seedChunk(
  chunkRepository: DefaultInMemoryDocumentChunkRepository,
  vectorIndex: InMemoryVectorIndex,
  embeddingProvider: FakeEmbeddingProvider,
  overrides: Partial<DocumentChunk> = {},
): Promise<DocumentChunk> {
  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: "doc-1",
    text: "aaaaaaaa",
    order: 0,
    ...overrides,
  };
  await chunkRepository.replaceForDocument(chunk.workspaceId, chunk.documentId, [
    chunk,
  ]);
  const vector = await embeddingProvider.embed(chunk.text);
  await vectorIndex.upsert({
    workspaceId: chunk.workspaceId,
    chunkId: chunk.id,
    vector,
  });
  return chunk;
}

async function assertExecutePassesValidInputAndReturnsResultUnchanged(): Promise<void> {
  console.log("[application] execute passes valid input to VectorRetriever and returns its RetrievalResult unchanged...");
  const embeddingProvider = new FakeEmbeddingProvider();
  const vectorIndex = new InMemoryVectorIndex();
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const retriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    chunkRepository,
  );
  const countingRetriever = new CountingVectorRetriever(retriever);
  const useCase = new RetrieveKnowledgeChunksUseCase(countingRetriever);

  const seeded = await seedChunk(chunkRepository, vectorIndex, embeddingProvider);

  const input: RetrieveKnowledgeChunksInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 5,
  };
  const directResult = await retriever.retrieve(input);
  const result = await useCase.execute(input);

  assertEqual(countingRetriever.retrieveCalls, 1, "expected the use case to call VectorRetriever.retrieve exactly once");
  assertEqual(countingRetriever.lastInput?.workspaceId, WORKSPACE_A, "expected the use case to pass workspaceId through unchanged");
  assertEqual(countingRetriever.lastInput?.query, "aaaaaaaa", "expected the use case to pass query through unchanged");
  assertEqual(countingRetriever.lastInput?.limit, 5, "expected the use case to pass limit through unchanged");
  assertEqual(result.query, directResult.query, "expected the use case's result to match a direct retriever call");
  assertEqual(result.chunks.length, directResult.chunks.length, "expected the same chunk count as a direct retriever call");
  assertEqual(result.chunks[0]?.chunk.id, seeded.id, "expected the seeded chunk to be retrieved");
}

async function assertRejectsInvalidInputWithoutCallingRetriever(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/limit input without calling VectorRetriever...");
  const countingRetriever = new CountingVectorRetriever(buildRealVectorRetriever());
  const useCase = new RetrieveKnowledgeChunksUseCase(countingRetriever);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrieveKnowledgeChunksInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrieveKnowledgeChunksInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrieveKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: -3 }),
    "RetrieveKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: 2.5 }),
    "RetrieveKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "RetrieveKnowledgeChunksInput must be an object",
  );

  assertEqual(countingRetriever.retrieveCalls, 0, "expected VectorRetriever.retrieve to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnVectorRetrieverPort();
  await assertExecutePassesValidInputAndReturnsResultUnchanged();
  await assertRejectsInvalidInputWithoutCallingRetriever();
  console.log("RetrieveKnowledgeChunksUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
