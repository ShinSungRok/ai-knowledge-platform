import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GenerateGroundedTextUseCase,
  type GenerateGroundedTextInput,
} from "./GenerateGroundedTextUseCase";
import {
  BuildGroundedPromptUseCase,
  type BuildGroundedPromptInput,
} from "./BuildGroundedPromptUseCase";
import { RetrieveGroundingContextUseCase } from "./RetrieveGroundingContextUseCase";
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
import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import type { PromptBuilder } from "../prompt/PromptBuilder";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GeneratedText } from "../ai/GeneratedText";
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

/** Dummy port stubs used only to satisfy `RetrieveGroundingContextUseCase`'s constructor when building an unused dummy instance for `super()` below; never actually called. */
const dummyRetrieveGroundingContextUseCase = new RetrieveGroundingContextUseCase(
  { async search(input) { return { query: input.query, chunks: [] }; } },
  { async assemble(input) { return { query: input.query, blocks: [], content: "", truncated: false }; } },
);

/** Dummy `PromptBuilder` used only to satisfy `BuildGroundedPromptUseCase`'s constructor when building an unused dummy instance for `super()` below; never actually called. */
const dummyPromptBuilder: PromptBuilder = {
  async build(context) {
    return { systemInstruction: "dummy", userMessage: context.query };
  },
};

/**
 * Counts calls, records the last input, and appends to a shared
 * call-order log, delegating to a real `BuildGroundedPromptUseCase`.
 * Extends the class (rather than a plain object literal) because
 * `BuildGroundedPromptUseCase` has private fields, so only a subclass —
 * never a structurally-shaped object — is assignable to its type. The
 * dummy dependencies passed to `super()` are never used: this class
 * fully overrides `execute` to delegate to `inner` instead of
 * `super.execute()`.
 */
class CountingBuildGroundedPromptUseCase extends BuildGroundedPromptUseCase {
  public executeCalls = 0;
  public lastInput: BuildGroundedPromptInput | null = null;

  constructor(
    private readonly inner: BuildGroundedPromptUseCase,
    private readonly callOrder: string[],
  ) {
    super(dummyRetrieveGroundingContextUseCase, dummyPromptBuilder);
  }

  override async execute(input: BuildGroundedPromptInput): Promise<GroundedPrompt> {
    this.executeCalls += 1;
    this.lastInput = input;
    this.callOrder.push("buildGroundedPrompt");
    return this.inner.execute(input);
  }
}

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real language model provider. */
class CountingLanguageModelProvider implements LanguageModelProvider {
  public generateCalls = 0;
  public lastInput: GroundedPrompt | null = null;

  constructor(
    private readonly inner: LanguageModelProvider,
    private readonly callOrder: string[],
  ) {}

  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    this.generateCalls += 1;
    this.lastInput = prompt;
    this.callOrder.push("languageModelProvider");
    return this.inner.generate(prompt);
  }
}

function assertDependsOnlyOnBuildGroundedPromptUseCaseAndLanguageModelProvider(): void {
  console.log("[application] GenerateGroundedTextUseCase depends only on BuildGroundedPromptUseCase and the LanguageModelProvider port...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/GenerateGroundedTextUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "./BuildGroundedPromptUseCase"'),
    "Use case must import BuildGroundedPromptUseCase",
  );
  assertTruthy(
    source.includes('from "../ai/LanguageModelProvider"'),
    "Use case must import the LanguageModelProvider port",
  );
  const forbiddenReferences = [
    "RetrieveGroundingContextUseCase",
    "DefaultPromptBuilder",
    "FakeLanguageModelProvider",
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
    "../context/",
    "../prompt/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `GenerateGroundedTextUseCase.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  buildGroundedPromptUseCase: BuildGroundedPromptUseCase;
  languageModelProvider: FakeLanguageModelProvider;
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
  const buildGroundedPromptUseCase = new BuildGroundedPromptUseCase(
    retrieveGroundingContextUseCase,
    promptBuilder,
  );
  const languageModelProvider = new FakeLanguageModelProvider();
  return {
    buildGroundedPromptUseCase,
    languageModelProvider,
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
  console.log("[application] execute calls BuildGroundedPromptUseCase before LanguageModelProvider, maps inputs correctly, and returns the provider's GeneratedText unchanged...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingBuild = new CountingBuildGroundedPromptUseCase(
    harness.buildGroundedPromptUseCase,
    callOrder,
  );
  const countingProvider = new CountingLanguageModelProvider(harness.languageModelProvider, callOrder);
  const useCase = new GenerateGroundedTextUseCase(countingBuild, countingProvider);

  await seedDocumentAndChunk(harness);

  const input: GenerateGroundedTextInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };
  const directPrompt = await harness.buildGroundedPromptUseCase.execute({
    workspaceId: input.workspaceId,
    query: input.query,
    retrievalLimit: input.retrievalLimit,
    maxCharacters: input.maxCharacters,
  });
  const directText = await harness.languageModelProvider.generate(directPrompt);

  const result = await useCase.execute(input);

  assertEqual(countingBuild.executeCalls, 1, "expected BuildGroundedPromptUseCase.execute to be called exactly once");
  assertEqual(countingProvider.generateCalls, 1, "expected LanguageModelProvider.generate to be called exactly once");
  assertEqual(callOrder.join(","), "buildGroundedPrompt,languageModelProvider", "expected BuildGroundedPromptUseCase to be called before LanguageModelProvider");

  assertEqual(countingBuild.lastInput?.workspaceId, WORKSPACE_A, "expected BuildGroundedPromptUseCase.execute input.workspaceId to be mapped from GenerateGroundedTextInput.workspaceId");
  assertEqual(countingBuild.lastInput?.query, "aaaaaaaa", "expected BuildGroundedPromptUseCase.execute input.query to be mapped from GenerateGroundedTextInput.query");
  assertEqual(countingBuild.lastInput?.retrievalLimit, 5, "expected BuildGroundedPromptUseCase.execute input.retrievalLimit to be mapped from GenerateGroundedTextInput.retrievalLimit");
  assertEqual(countingBuild.lastInput?.maxCharacters, 10_000, "expected BuildGroundedPromptUseCase.execute input.maxCharacters to be mapped from GenerateGroundedTextInput.maxCharacters");

  assertEqual(countingProvider.lastInput?.systemInstruction, directPrompt.systemInstruction, "expected LanguageModelProvider.generate to receive BuildGroundedPromptUseCase's own GroundedPrompt.systemInstruction");
  assertEqual(countingProvider.lastInput?.userMessage, directPrompt.userMessage, "expected LanguageModelProvider.generate to receive BuildGroundedPromptUseCase's own GroundedPrompt.userMessage");

  assertEqual(result.text, directText.text, "expected the use case's result.text to match a direct call sequence");
}

async function assertRejectsInvalidInputWithoutCallingEitherDependency(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/retrievalLimit/maxCharacters input without calling BuildGroundedPromptUseCase or LanguageModelProvider...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const countingBuild = new CountingBuildGroundedPromptUseCase(
    harness.buildGroundedPromptUseCase,
    callOrder,
  );
  const countingProvider = new CountingLanguageModelProvider(harness.languageModelProvider, callOrder);
  const useCase = new GenerateGroundedTextUseCase(countingBuild, countingProvider);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateGroundedTextInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateGroundedTextInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }),
    "GenerateGroundedTextInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 2.5, maxCharacters: 100 }),
    "GenerateGroundedTextInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }),
    "GenerateGroundedTextInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -5 }),
    "GenerateGroundedTextInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "GenerateGroundedTextInput must be an object",
  );

  assertEqual(countingBuild.executeCalls, 0, "expected BuildGroundedPromptUseCase.execute to never be called for invalid input");
  assertEqual(countingProvider.generateCalls, 0, "expected LanguageModelProvider.generate to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnBuildGroundedPromptUseCaseAndLanguageModelProvider();
  await assertExecuteDelegatesInSequenceWithMappedInputsAndUnchangedResult();
  await assertRejectsInvalidInputWithoutCallingEitherDependency();
  console.log("GenerateGroundedTextUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
