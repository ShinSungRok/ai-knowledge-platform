import { readFileSync } from "node:fs";
import path from "node:path";

import {
  BuildGroundedPromptUseCase,
  type BuildGroundedPromptInput,
} from "./BuildGroundedPromptUseCase";
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
import { DefaultPromptBuilder } from "../prompt/DefaultPromptBuilder";
import type { PromptBuilder } from "../prompt/PromptBuilder";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { GroundingContext } from "../context/GroundingContext";
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

/**
 * Counts calls, records the last input, and appends to a shared
 * call-order log, delegating to a real `RetrieveGroundingContextUseCase`.
 * Extends the class (rather than a plain object literal) because
 * `RetrieveGroundingContextUseCase` has private fields, so only a
 * subclass — never a structurally-shaped object — is assignable to its
 * type. The dummy port stubs passed to `super()` are never used: this
 * class fully overrides `execute` to delegate to `inner` instead of
 * `super.execute()`.
 */
class CountingRetrieveGroundingContextUseCase extends RetrieveGroundingContextUseCase {
  public executeCalls = 0;
  public lastInput: RetrieveGroundingContextInput | null = null;

  constructor(
    private readonly inner: RetrieveGroundingContextUseCase,
    private readonly callOrder: string[],
  ) {
    super(
      { async search(input) { return { query: input.query, chunks: [] }; } },
      { async assemble(input) { return { query: input.query, blocks: [], content: "", truncated: false }; } },
    );
  }

  override async execute(input: RetrieveGroundingContextInput): Promise<GroundingContext> {
    this.executeCalls += 1;
    this.lastInput = input;
    this.callOrder.push("retrieveGroundingContext");
    return this.inner.execute(input);
  }
}

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real prompt builder. */
class CountingPromptBuilder implements PromptBuilder {
  public buildCalls = 0;
  public lastInput: GroundingContext | null = null;

  constructor(
    private readonly inner: PromptBuilder,
    private readonly callOrder: string[],
  ) {}

  async build(context: GroundingContext): Promise<GroundedPrompt> {
    this.buildCalls += 1;
    this.lastInput = context;
    this.callOrder.push("promptBuilder");
    return this.inner.build(context);
  }
}

function assertDependsOnlyOnRetrieveGroundingContextUseCaseAndPromptBuilder(): void {
  console.log("[application] BuildGroundedPromptUseCase depends only on RetrieveGroundingContextUseCase and the PromptBuilder port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/BuildGroundedPromptUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "./RetrieveGroundingContextUseCase"'),
    "Use case must import RetrieveGroundingContextUseCase",
  );
  assertTruthy(
    source.includes('from "../prompt/PromptBuilder"'),
    "Use case must import the PromptBuilder port",
  );
  const forbiddenReferences = [
    "DefaultPromptBuilder",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "DefaultContextAssembler",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "DefaultInMemoryDocumentChunkRepository",
    "DefaultInMemoryRepository",
    "../embedding/",
    "../persistence/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../context/ContextAssembler",
    "../context/ContextAssemblyInput",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `BuildGroundedPromptUseCase.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  retrieveGroundingContextUseCase: RetrieveGroundingContextUseCase;
  promptBuilder: DefaultPromptBuilder;
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
  const retrieveGroundingContextUseCase = new RetrieveGroundingContextUseCase(
    rerankedSearch,
    contextAssembler,
  );
  const promptBuilder = new DefaultPromptBuilder();
  return {
    retrieveGroundingContextUseCase,
    promptBuilder,
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
  console.log("[application] execute calls RetrieveGroundingContextUseCase before PromptBuilder, maps inputs correctly, and returns the builder's GroundedPrompt unchanged...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingRetrieve = new CountingRetrieveGroundingContextUseCase(
    harness.retrieveGroundingContextUseCase,
    callOrder,
  );
  const countingPromptBuilder = new CountingPromptBuilder(harness.promptBuilder, callOrder);
  const useCase = new BuildGroundedPromptUseCase(countingRetrieve, countingPromptBuilder);

  await seedDocumentAndChunk(harness);

  const input: BuildGroundedPromptInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };
  const directContext = await harness.retrieveGroundingContextUseCase.execute({
    workspaceId: input.workspaceId,
    query: input.query,
    retrievalLimit: input.retrievalLimit,
    maxCharacters: input.maxCharacters,
  });
  const directPrompt = await harness.promptBuilder.build(directContext);

  const result = await useCase.execute(input);

  assertEqual(countingRetrieve.executeCalls, 1, "expected RetrieveGroundingContextUseCase.execute to be called exactly once");
  assertEqual(countingPromptBuilder.buildCalls, 1, "expected PromptBuilder.build to be called exactly once");
  assertEqual(callOrder.join(","), "retrieveGroundingContext,promptBuilder", "expected RetrieveGroundingContextUseCase to be called before PromptBuilder");

  assertEqual(countingRetrieve.lastInput?.workspaceId, WORKSPACE_A, "expected RetrieveGroundingContextUseCase.execute input.workspaceId to be mapped from BuildGroundedPromptInput.workspaceId");
  assertEqual(countingRetrieve.lastInput?.query, "aaaaaaaa", "expected RetrieveGroundingContextUseCase.execute input.query to be mapped from BuildGroundedPromptInput.query");
  assertEqual(countingRetrieve.lastInput?.retrievalLimit, 5, "expected RetrieveGroundingContextUseCase.execute input.retrievalLimit to be mapped from BuildGroundedPromptInput.retrievalLimit");
  assertEqual(countingRetrieve.lastInput?.maxCharacters, 10_000, "expected RetrieveGroundingContextUseCase.execute input.maxCharacters to be mapped from BuildGroundedPromptInput.maxCharacters");

  assertEqual(countingPromptBuilder.lastInput?.query, directContext.query, "expected PromptBuilder.build to receive RetrieveGroundingContextUseCase's own GroundingContext.query");
  assertEqual(countingPromptBuilder.lastInput?.content, directContext.content, "expected PromptBuilder.build to receive RetrieveGroundingContextUseCase's own GroundingContext.content");
  assertEqual(countingPromptBuilder.lastInput?.truncated, directContext.truncated, "expected PromptBuilder.build to receive RetrieveGroundingContextUseCase's own GroundingContext.truncated");
  assertEqual(countingPromptBuilder.lastInput?.blocks.length, directContext.blocks.length, "expected PromptBuilder.build to receive RetrieveGroundingContextUseCase's own GroundingContext.blocks");

  assertEqual(result.systemInstruction, directPrompt.systemInstruction, "expected the use case's result.systemInstruction to match a direct call sequence");
  assertEqual(result.userMessage, directPrompt.userMessage, "expected the use case's result.userMessage to match a direct call sequence");
}

async function assertRejectsInvalidInputWithoutCallingEitherDependency(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/retrievalLimit/maxCharacters input without calling RetrieveGroundingContextUseCase or PromptBuilder...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingRetrieve = new CountingRetrieveGroundingContextUseCase(
    harness.retrieveGroundingContextUseCase,
    callOrder,
  );
  const countingPromptBuilder = new CountingPromptBuilder(harness.promptBuilder, callOrder);
  const useCase = new BuildGroundedPromptUseCase(countingRetrieve, countingPromptBuilder);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }),
    "BuildGroundedPromptInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }),
    "BuildGroundedPromptInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }),
    "BuildGroundedPromptInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 2.5, maxCharacters: 100 }),
    "BuildGroundedPromptInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }),
    "BuildGroundedPromptInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -5 }),
    "BuildGroundedPromptInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "BuildGroundedPromptInput must be an object",
  );

  assertEqual(countingRetrieve.executeCalls, 0, "expected RetrieveGroundingContextUseCase.execute to never be called for invalid input");
  assertEqual(countingPromptBuilder.buildCalls, 0, "expected PromptBuilder.build to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnRetrieveGroundingContextUseCaseAndPromptBuilder();
  await assertExecuteDelegatesInSequenceWithMappedInputsAndUnchangedResult();
  await assertRejectsInvalidInputWithoutCallingEitherDependency();
  console.log("BuildGroundedPromptUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
