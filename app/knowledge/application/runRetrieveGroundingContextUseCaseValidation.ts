import { readFileSync } from "node:fs";
import path from "node:path";

import {
  RetrieveGroundingContextUseCase,
  type RetrieveGroundingContextInput,
} from "./RetrieveGroundingContextUseCase";
import { DefaultRerankedSearch } from "../search/DefaultRerankedSearch";
import { DefaultHybridSearch } from "../search/DefaultHybridSearch";
import { DefaultKeywordSearch } from "../search/DefaultKeywordSearch";
import { DefaultReranker } from "../search/DefaultReranker";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultContextAssembler } from "../context/DefaultContextAssembler";
import type { RerankedSearch } from "../search/RerankedSearch";
import type { ContextAssembler } from "../context/ContextAssembler";
import type { ContextAssemblyInput } from "../context/ContextAssemblyInput";
import type { GroundingContext } from "../context/GroundingContext";
import type { RetrievalInput } from "../retrieval/RetrievalInput";
import type { RetrievalResult } from "../retrieval/RetrievalResult";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

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

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real reranked search. */
class CountingRerankedSearch implements RerankedSearch {
  public searchCalls = 0;
  public lastInput: RetrievalInput | null = null;

  constructor(
    private readonly inner: RerankedSearch,
    private readonly callOrder: string[],
  ) {}

  async search(input: RetrievalInput): Promise<RetrievalResult> {
    this.searchCalls += 1;
    this.lastInput = input;
    this.callOrder.push("rerankedSearch");
    return this.inner.search(input);
  }
}

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real context assembler. */
class CountingContextAssembler implements ContextAssembler {
  public assembleCalls = 0;
  public lastInput: ContextAssemblyInput | null = null;

  constructor(
    private readonly inner: ContextAssembler,
    private readonly callOrder: string[],
  ) {}

  async assemble(input: ContextAssemblyInput): Promise<GroundingContext> {
    this.assembleCalls += 1;
    this.lastInput = input;
    this.callOrder.push("contextAssembler");
    return this.inner.assemble(input);
  }
}

function assertDependsOnlyOnRerankedSearchAndContextAssemblerPorts(): void {
  console.log("[application] RetrieveGroundingContextUseCase depends only on the RerankedSearch and ContextAssembler ports...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RetrieveGroundingContextUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "../search/RerankedSearch"'),
    "Use case must import the RerankedSearch port",
  );
  assertTruthy(
    source.includes('from "../context/ContextAssembler"'),
    "Use case must import the ContextAssembler port",
  );
  const forbiddenReferences = [
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "DefaultContextAssembler",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "DefaultInMemoryRepository",
    "../embedding/",
    "../persistence/",
    "../repository/",
    "../search/DefaultHybridSearch",
    "../search/DefaultRerankedSearch",
    "../search/HybridSearch",
    "../search/Reranker",
    "../search/KeywordSearch",
    "../retrieval/VectorRetriever",
    "../retrieval/RetrievalInput",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RetrieveGroundingContextUseCase.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  rerankedSearch: DefaultRerankedSearch;
  contextAssembler: DefaultContextAssembler;
  chunkRepository: DefaultInMemoryDocumentChunkRepository;
  vectorIndex: InMemoryVectorIndex;
  embeddingProvider: FakeEmbeddingProvider;
  documentRepository: DefaultInMemoryRepository;
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
  const reranker = new DefaultReranker();
  const rerankedSearch = new DefaultRerankedSearch(hybridSearch, reranker);
  const documentRepository = new DefaultInMemoryRepository();
  const contextAssembler = new DefaultContextAssembler(documentRepository);
  return {
    rerankedSearch,
    contextAssembler,
    chunkRepository,
    vectorIndex,
    embeddingProvider,
    documentRepository,
  };
}

async function seedDocumentAndChunk(
  harness: Harness,
  overrides: Partial<DocumentChunk> = {},
  documentOverrides: Partial<KnowledgeDocument> = {},
): Promise<DocumentChunk> {
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "document text",
    ...documentOverrides,
  };
  await harness.documentRepository.save(document);

  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: document.id,
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

async function assertExecuteDelegatesInSequenceWithMappedInputsAndUnchangedResult(): Promise<void> {
  console.log("[application] execute calls RerankedSearch before ContextAssembler, maps inputs correctly, and returns the assembler's GroundingContext unchanged...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingRerankedSearch = new CountingRerankedSearch(harness.rerankedSearch, callOrder);
  const countingContextAssembler = new CountingContextAssembler(harness.contextAssembler, callOrder);
  const useCase = new RetrieveGroundingContextUseCase(
    countingRerankedSearch,
    countingContextAssembler,
  );

  const seeded = await seedDocumentAndChunk(harness);

  const input: RetrieveGroundingContextInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };
  const directRetrieval = await harness.rerankedSearch.search({
    workspaceId: input.workspaceId,
    query: input.query,
    limit: input.retrievalLimit,
  });
  const directResult = await harness.contextAssembler.assemble({
    workspaceId: input.workspaceId,
    query: input.query,
    chunks: directRetrieval.chunks,
    maxCharacters: input.maxCharacters,
  });

  const result = await useCase.execute(input);

  assertEqual(countingRerankedSearch.searchCalls, 1, "expected RerankedSearch.search to be called exactly once");
  assertEqual(countingContextAssembler.assembleCalls, 1, "expected ContextAssembler.assemble to be called exactly once");
  assertEqual(callOrder.join(","), "rerankedSearch,contextAssembler", "expected RerankedSearch to be called before ContextAssembler");

  assertEqual(countingRerankedSearch.lastInput?.workspaceId, WORKSPACE_A, "expected RerankedSearch.search input.workspaceId to be mapped from RetrieveGroundingContextInput.workspaceId");
  assertEqual(countingRerankedSearch.lastInput?.query, "aaaaaaaa", "expected RerankedSearch.search input.query to be mapped from RetrieveGroundingContextInput.query");
  assertEqual(countingRerankedSearch.lastInput?.limit, 5, "expected RerankedSearch.search input.limit to be mapped from RetrieveGroundingContextInput.retrievalLimit");

  assertEqual(countingContextAssembler.lastInput?.workspaceId, WORKSPACE_A, "expected ContextAssembler.assemble input.workspaceId to be mapped from RetrieveGroundingContextInput.workspaceId");
  assertEqual(countingContextAssembler.lastInput?.query, "aaaaaaaa", "expected ContextAssembler.assemble input.query to be mapped from RetrieveGroundingContextInput.query");
  assertEqual(countingContextAssembler.lastInput?.maxCharacters, 10_000, "expected ContextAssembler.assemble input.maxCharacters to be mapped from RetrieveGroundingContextInput.maxCharacters");
  assertEqual(countingContextAssembler.lastInput?.chunks.length, directRetrieval.chunks.length, "expected ContextAssembler.assemble to receive the RerankedSearch RetrievalResult's own chunks");
  assertEqual(countingContextAssembler.lastInput?.chunks[0]?.chunk.id, directRetrieval.chunks[0]?.chunk.id, "expected the same chunks (in the same order) passed from RerankedSearch's result into ContextAssembler's input");

  assertEqual(result.query, directResult.query, "expected the use case's result.query to match a direct call sequence");
  assertEqual(result.content, directResult.content, "expected the use case's result.content to match a direct call sequence");
  assertEqual(result.truncated, directResult.truncated, "expected the use case's result.truncated to match a direct call sequence");
  assertEqual(result.blocks.length, 1, "expected exactly one grounding context block");
  assertEqual(result.blocks[0]?.chunkId, seeded.id, "expected the seeded chunk to be present in the returned grounding context");
}

async function assertRejectsInvalidInputWithoutCallingEitherDependency(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/retrievalLimit/maxCharacters input without calling RerankedSearch or ContextAssembler...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingRerankedSearch = new CountingRerankedSearch(harness.rerankedSearch, callOrder);
  const countingContextAssembler = new CountingContextAssembler(harness.contextAssembler, callOrder);
  const useCase = new RetrieveGroundingContextUseCase(
    countingRerankedSearch,
    countingContextAssembler,
  );

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }),
    "RetrieveGroundingContextInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }),
    "RetrieveGroundingContextInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }),
    "RetrieveGroundingContextInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 2.5, maxCharacters: 100 }),
    "RetrieveGroundingContextInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }),
    "RetrieveGroundingContextInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -5 }),
    "RetrieveGroundingContextInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "RetrieveGroundingContextInput must be an object",
  );

  assertEqual(countingRerankedSearch.searchCalls, 0, "expected RerankedSearch.search to never be called for invalid input");
  assertEqual(countingContextAssembler.assembleCalls, 0, "expected ContextAssembler.assemble to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnRerankedSearchAndContextAssemblerPorts();
  await assertExecuteDelegatesInSequenceWithMappedInputsAndUnchangedResult();
  await assertRejectsInvalidInputWithoutCallingEitherDependency();
  console.log("RetrieveGroundingContextUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
