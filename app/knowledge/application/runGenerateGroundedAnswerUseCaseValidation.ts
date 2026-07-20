import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GenerateGroundedAnswerUseCase,
  type GenerateGroundedAnswerInput,
} from "./GenerateGroundedAnswerUseCase";
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
import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import { DefaultGroundedAnswerAssembler } from "../rag/DefaultGroundedAnswerAssembler";
import type { PromptBuilder } from "../prompt/PromptBuilder";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import type { GeneratedText } from "../ai/GeneratedText";
import type { GroundedAnswerAssembler } from "../rag/GroundedAnswerAssembler";
import type { GroundedAnswerAssemblyInput } from "../rag/GroundedAnswerAssemblyInput";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
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

/** Dummy port stubs used only to satisfy `RetrieveGroundingContextUseCase`'s constructor when building an unused dummy instance for `super()` below; never actually called. */
const dummyRetrieveGroundingContextDeps = {
  rerankedSearch: {
    async search(input: { query: string }) {
      return { query: input.query, chunks: [] };
    },
  },
  contextAssembler: {
    async assemble(input: { query: string }) {
      return { query: input.query, blocks: [], content: "", truncated: false };
    },
  },
};

/**
 * Counts calls, records the last input, and appends to a shared
 * call-order log, delegating to a real `RetrieveGroundingContextUseCase`.
 * Extends the class (rather than a plain object literal) because
 * `RetrieveGroundingContextUseCase` has private fields, so only a
 * subclass — never a structurally-shaped object — is assignable to its
 * type. The dummy dependencies passed to `super()` are never used: this
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
    super(dummyRetrieveGroundingContextDeps.rerankedSearch, dummyRetrieveGroundingContextDeps.contextAssembler);
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

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real grounded answer assembler. */
class CountingGroundedAnswerAssembler implements GroundedAnswerAssembler {
  public assembleCalls = 0;
  public lastInput: GroundedAnswerAssemblyInput | null = null;

  constructor(
    private readonly inner: GroundedAnswerAssembler,
    private readonly callOrder: string[],
  ) {}

  async assemble(input: GroundedAnswerAssemblyInput): Promise<GroundedAnswer> {
    this.assembleCalls += 1;
    this.lastInput = input;
    this.callOrder.push("groundedAnswerAssembler");
    return this.inner.assemble(input);
  }
}

function assertDependsOnlyOnItsFourDeclaredDependencies(): void {
  console.log("[application] GenerateGroundedAnswerUseCase depends only on RetrieveGroundingContextUseCase, PromptBuilder, LanguageModelProvider, and GroundedAnswerAssembler...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/GenerateGroundedAnswerUseCase.ts",
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
  assertTruthy(
    source.includes('from "../ai/LanguageModelProvider"'),
    "Use case must import the LanguageModelProvider port",
  );
  assertTruthy(
    source.includes('from "../rag/GroundedAnswerAssembler"'),
    "Use case must import the GroundedAnswerAssembler port",
  );
  const forbiddenReferences = [
    "BuildGroundedPromptUseCase",
    "GenerateGroundedTextUseCase",
    "DefaultPromptBuilder",
    "FakeLanguageModelProvider",
    "DefaultGroundedAnswerAssembler",
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
      `GenerateGroundedAnswerUseCase.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  retrieveGroundingContextUseCase: RetrieveGroundingContextUseCase;
  promptBuilder: DefaultPromptBuilder;
  languageModelProvider: FakeLanguageModelProvider;
  groundedAnswerAssembler: DefaultGroundedAnswerAssembler;
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
  const languageModelProvider = new FakeLanguageModelProvider();
  const groundedAnswerAssembler = new DefaultGroundedAnswerAssembler();
  return {
    retrieveGroundingContextUseCase,
    promptBuilder,
    languageModelProvider,
    groundedAnswerAssembler,
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

function buildUseCaseWithCounters(harness: Harness, callOrder: string[]) {
  const countingRetrieve = new CountingRetrieveGroundingContextUseCase(
    harness.retrieveGroundingContextUseCase,
    callOrder,
  );
  const countingPromptBuilder = new CountingPromptBuilder(harness.promptBuilder, callOrder);
  const countingProvider = new CountingLanguageModelProvider(harness.languageModelProvider, callOrder);
  const countingAssembler = new CountingGroundedAnswerAssembler(harness.groundedAnswerAssembler, callOrder);
  const useCase = new GenerateGroundedAnswerUseCase(
    countingRetrieve,
    countingPromptBuilder,
    countingProvider,
    countingAssembler,
  );
  return { useCase, countingRetrieve, countingPromptBuilder, countingProvider, countingAssembler };
}

async function assertEvidencePresentCallsAllFourInSequenceWithMappedInputsAndUnchangedResult(): Promise<void> {
  console.log("[application] execute calls RetrieveGroundingContextUseCase, PromptBuilder, LanguageModelProvider, then GroundedAnswerAssembler in order when evidence is present, maps inputs correctly, and returns the assembler's GroundedAnswer unchanged...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingRetrieve, countingPromptBuilder, countingProvider, countingAssembler } =
    buildUseCaseWithCounters(harness, callOrder);

  await seedDocumentAndChunk(harness);

  const input: GenerateGroundedAnswerInput = {
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
  const directGeneratedText = await harness.languageModelProvider.generate(directPrompt);
  const directAnswer = await harness.groundedAnswerAssembler.assemble({
    context: directContext,
    generatedText: directGeneratedText,
  });

  const result = await useCase.execute(input);

  assertEqual(countingRetrieve.executeCalls, 1, "expected RetrieveGroundingContextUseCase.execute to be called exactly once");
  assertEqual(countingPromptBuilder.buildCalls, 1, "expected PromptBuilder.build to be called exactly once when evidence is present");
  assertEqual(countingProvider.generateCalls, 1, "expected LanguageModelProvider.generate to be called exactly once when evidence is present");
  assertEqual(countingAssembler.assembleCalls, 1, "expected GroundedAnswerAssembler.assemble to be called exactly once");
  assertEqual(
    callOrder.join(","),
    "retrieveGroundingContext,promptBuilder,languageModelProvider,groundedAnswerAssembler",
    "expected the four dependencies to be called in exactly this order when evidence is present",
  );

  assertEqual(countingRetrieve.lastInput?.workspaceId, WORKSPACE_A, "expected RetrieveGroundingContextUseCase.execute input.workspaceId to be mapped from GenerateGroundedAnswerInput.workspaceId");
  assertEqual(countingRetrieve.lastInput?.query, "aaaaaaaa", "expected RetrieveGroundingContextUseCase.execute input.query to be mapped from GenerateGroundedAnswerInput.query");
  assertEqual(countingRetrieve.lastInput?.retrievalLimit, 5, "expected RetrieveGroundingContextUseCase.execute input.retrievalLimit to be mapped from GenerateGroundedAnswerInput.retrievalLimit");
  assertEqual(countingRetrieve.lastInput?.maxCharacters, 10_000, "expected RetrieveGroundingContextUseCase.execute input.maxCharacters to be mapped from GenerateGroundedAnswerInput.maxCharacters");

  assertEqual(countingPromptBuilder.lastInput?.query, directContext.query, "expected PromptBuilder.build to receive the retrieved GroundingContext.query");
  assertEqual(countingPromptBuilder.lastInput?.blocks.length, directContext.blocks.length, "expected PromptBuilder.build to receive the retrieved GroundingContext.blocks");

  assertEqual(countingProvider.lastInput?.systemInstruction, directPrompt.systemInstruction, "expected LanguageModelProvider.generate to receive PromptBuilder's own GroundedPrompt.systemInstruction");
  assertEqual(countingProvider.lastInput?.userMessage, directPrompt.userMessage, "expected LanguageModelProvider.generate to receive PromptBuilder's own GroundedPrompt.userMessage");

  assertEqual(countingAssembler.lastInput?.context.query, directContext.query, "expected GroundedAnswerAssembler.assemble to receive the retrieved GroundingContext.query");
  assertEqual(countingAssembler.lastInput?.context.blocks.length, directContext.blocks.length, "expected GroundedAnswerAssembler.assemble to receive the retrieved GroundingContext.blocks");
  assertEqual(countingAssembler.lastInput?.generatedText.text, directGeneratedText.text, "expected GroundedAnswerAssembler.assemble to receive the provider's own GeneratedText.text");

  assertEqual(result.text, directAnswer.text, "expected the use case's result.text to match a direct call sequence");
  assertEqual(result.insufficientEvidence, directAnswer.insufficientEvidence, "expected the use case's result.insufficientEvidence to match a direct call sequence");
  assertEqual(result.evidence.length, directAnswer.evidence.length, "expected the use case's result.evidence to match a direct call sequence");
}

async function assertEvidenceAbsentSkipsPromptBuilderAndProvider(): Promise<void> {
  console.log("[application] execute never calls PromptBuilder or LanguageModelProvider when the retrieved context has no evidence blocks, and passes an empty generated text to GroundedAnswerAssembler...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingRetrieve, countingPromptBuilder, countingProvider, countingAssembler } =
    buildUseCaseWithCounters(harness, callOrder);

  const input: GenerateGroundedAnswerInput = {
    workspaceId: WORKSPACE_A,
    query: "no matching chunks at all",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };

  const result = await useCase.execute(input);

  assertEqual(countingRetrieve.executeCalls, 1, "expected RetrieveGroundingContextUseCase.execute to still be called exactly once");
  assertEqual(countingPromptBuilder.buildCalls, 0, "expected PromptBuilder.build to never be called when evidence is absent");
  assertEqual(countingProvider.generateCalls, 0, "expected LanguageModelProvider.generate to never be called when evidence is absent");
  assertEqual(countingAssembler.assembleCalls, 1, "expected GroundedAnswerAssembler.assemble to still be called exactly once");
  assertEqual(callOrder.join(","), "retrieveGroundingContext,groundedAnswerAssembler", "expected only retrieval and assembly to run when evidence is absent");

  assertEqual(countingAssembler.lastInput?.context.blocks.length, 0, "expected GroundedAnswerAssembler.assemble to receive the empty-evidence context");
  assertEqual(countingAssembler.lastInput?.generatedText.text, "", "expected GroundedAnswerAssembler.assemble to receive an empty GeneratedText.text");
  assertEqual(result.insufficientEvidence, true, "expected the final GroundedAnswer.insufficientEvidence to be true");
  assertEqual(result.evidence.length, 0, "expected the final GroundedAnswer.evidence to be empty");
}

async function assertRejectsInvalidInputWithoutCallingAnyDependency(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/retrievalLimit/maxCharacters input without calling any of its four dependencies...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingRetrieve, countingPromptBuilder, countingProvider, countingAssembler } =
    buildUseCaseWithCounters(harness, callOrder);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateGroundedAnswerInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateGroundedAnswerInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }),
    "GenerateGroundedAnswerInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 2.5, maxCharacters: 100 }),
    "GenerateGroundedAnswerInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }),
    "GenerateGroundedAnswerInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -5 }),
    "GenerateGroundedAnswerInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "GenerateGroundedAnswerInput must be an object",
  );

  assertEqual(countingRetrieve.executeCalls, 0, "expected RetrieveGroundingContextUseCase.execute to never be called for invalid input");
  assertEqual(countingPromptBuilder.buildCalls, 0, "expected PromptBuilder.build to never be called for invalid input");
  assertEqual(countingProvider.generateCalls, 0, "expected LanguageModelProvider.generate to never be called for invalid input");
  assertEqual(countingAssembler.assembleCalls, 0, "expected GroundedAnswerAssembler.assemble to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnItsFourDeclaredDependencies();
  await assertEvidencePresentCallsAllFourInSequenceWithMappedInputsAndUnchangedResult();
  await assertEvidenceAbsentSkipsPromptBuilderAndProvider();
  await assertRejectsInvalidInputWithoutCallingAnyDependency();
  console.log("GenerateGroundedAnswerUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
