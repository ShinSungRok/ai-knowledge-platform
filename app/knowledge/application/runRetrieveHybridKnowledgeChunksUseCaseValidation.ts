import { readFileSync } from "node:fs";
import path from "node:path";

import {
  RetrieveHybridKnowledgeChunksUseCase,
  type RetrieveHybridKnowledgeChunksInput,
} from "./RetrieveHybridKnowledgeChunksUseCase";
import { DefaultHybridSearch } from "../search/DefaultHybridSearch";
import { DefaultKeywordSearch } from "../search/DefaultKeywordSearch";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import type { HybridSearch } from "../search/HybridSearch";
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

/** Counts calls and records the last input, delegating to a real hybrid search. */
class CountingHybridSearch implements HybridSearch {
  public searchCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(private readonly inner: HybridSearch) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    this.searchCalls += 1;
    this.lastInput = input;
    return this.inner.search(input);
  }
}

function assertDependsOnlyOnHybridSearchPort(): void {
  console.log("[application] RetrieveHybridKnowledgeChunksUseCase depends only on the HybridSearch port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RetrieveHybridKnowledgeChunksUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../search/HybridSearch"'),
    "Use case must import the HybridSearch port",
  );
  const forbiddenReferences = [
    "DefaultHybridSearch",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "../embedding/",
    "../persistence/",
    "../repository/",
    "../search/DefaultHybridSearch",
    "../search/KeywordSearch",
    "../retrieval/VectorRetriever",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RetrieveHybridKnowledgeChunksUseCase.ts must not reference "${reference}"`,
    );
  }
}

function buildRealHybridSearch(): DefaultHybridSearch {
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const embeddingProvider = new FakeEmbeddingProvider();
  const vectorIndex = new InMemoryVectorIndex();
  const vectorRetriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    chunkRepository,
  );
  const keywordSearch = new DefaultKeywordSearch(chunkRepository);
  return new DefaultHybridSearch(vectorRetriever, keywordSearch);
}

interface Harness {
  hybridSearch: DefaultHybridSearch;
  chunkRepository: DefaultInMemoryDocumentChunkRepository;
  vectorIndex: InMemoryVectorIndex;
  embeddingProvider: FakeEmbeddingProvider;
}

function buildHarness(): Harness {
  const chunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const embeddingProvider = new FakeEmbeddingProvider();
  const vectorIndex = new InMemoryVectorIndex();
  const vectorRetriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    chunkRepository,
  );
  const keywordSearch = new DefaultKeywordSearch(chunkRepository);
  const hybridSearch = new DefaultHybridSearch(vectorRetriever, keywordSearch);
  return { hybridSearch, chunkRepository, vectorIndex, embeddingProvider };
}

async function seedChunk(
  harness: Harness,
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
  await harness.chunkRepository.replaceForDocument(
    chunk.workspaceId,
    chunk.documentId,
    [chunk],
  );
  const vector = await harness.embeddingProvider.embed(chunk.text);
  await harness.vectorIndex.upsert({
    workspaceId: chunk.workspaceId,
    chunkId: chunk.id,
    vector,
  });
  return chunk;
}

async function assertExecutePassesValidInputAndReturnsResultUnchanged(): Promise<void> {
  console.log("[application] execute passes valid input to HybridSearch and returns its RetrievalResult unchanged...");
  const harness = buildHarness();
  const countingSearch = new CountingHybridSearch(harness.hybridSearch);
  const useCase = new RetrieveHybridKnowledgeChunksUseCase(countingSearch);

  const seeded = await seedChunk(harness);

  const input: RetrieveHybridKnowledgeChunksInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    limit: 5,
  };
  const directResult = await harness.hybridSearch.search(input);
  const result = await useCase.execute(input);

  assertEqual(countingSearch.searchCalls, 1, "expected the use case to call HybridSearch.search exactly once");
  assertEqual(countingSearch.lastInput?.workspaceId, WORKSPACE_A, "expected the use case to pass workspaceId through unchanged");
  assertEqual(countingSearch.lastInput?.query, "aaaaaaaa", "expected the use case to pass query through unchanged");
  assertEqual(countingSearch.lastInput?.limit, 5, "expected the use case to pass limit through unchanged");
  assertEqual(result.query, directResult.query, "expected the use case's result to match a direct HybridSearch call");
  assertEqual(result.chunks.length, directResult.chunks.length, "expected the same chunk count as a direct HybridSearch call");
  assertEqual(result.chunks[0]?.chunk.id, seeded.id, "expected the seeded chunk to be retrieved");
}

async function assertRejectsInvalidInputWithoutCallingHybridSearch(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/limit input without calling HybridSearch...");
  const countingSearch = new CountingHybridSearch(buildRealHybridSearch());
  const useCase = new RetrieveHybridKnowledgeChunksUseCase(countingSearch);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", limit: 1 }),
    "RetrieveHybridKnowledgeChunksInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", limit: 1 }),
    "RetrieveHybridKnowledgeChunksInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: 0 }),
    "RetrieveHybridKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: -3 }),
    "RetrieveHybridKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", limit: 2.5 }),
    "RetrieveHybridKnowledgeChunksInput.limit must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "RetrieveHybridKnowledgeChunksInput must be an object",
  );

  assertEqual(countingSearch.searchCalls, 0, "expected HybridSearch.search to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnHybridSearchPort();
  await assertExecutePassesValidInputAndReturnsResultUnchanged();
  await assertRejectsInvalidInputWithoutCallingHybridSearch();
  console.log("RetrieveHybridKnowledgeChunksUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
