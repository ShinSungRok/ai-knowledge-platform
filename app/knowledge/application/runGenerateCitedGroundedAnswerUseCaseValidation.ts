import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GenerateCitedGroundedAnswerUseCase,
  type GenerateCitedGroundedAnswerInput,
} from "./GenerateCitedGroundedAnswerUseCase";
import {
  GenerateGroundedAnswerUseCase,
  type GenerateGroundedAnswerInput,
} from "./GenerateGroundedAnswerUseCase";
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
import { DefaultGroundedAnswerAssembler } from "../rag/DefaultGroundedAnswerAssembler";
import { DefaultCitationBuilder } from "../citation/DefaultCitationBuilder";
import type { CitationBuilder } from "../citation/CitationBuilder";
import type { Citation } from "../citation/Citation";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
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

/** Dummy dependencies used only to satisfy `GenerateGroundedAnswerUseCase`'s constructor when building an unused dummy instance for `super()` below; never actually called. */
const dummyGenerateGroundedAnswerDeps = {
  retrieveGroundingContextUseCase: new RetrieveGroundingContextUseCase(
    { async search(input) { return { query: input.query, chunks: [] }; } },
    { async assemble(input) { return { query: input.query, blocks: [], content: "", truncated: false }; } },
  ),
  promptBuilder: {
    async build(context: { query: string }) {
      return { systemInstruction: "dummy", userMessage: context.query };
    },
  },
  languageModelProvider: {
    async generate(prompt: { userMessage: string }) {
      return { text: prompt.userMessage };
    },
  },
  groundedAnswerAssembler: {
    async assemble() {
      return {
        text: "",
        evidence: [],
        insufficientEvidence: true,
      };
    },
  },
};

/**
 * Counts calls, records the last input, and appends to a shared
 * call-order log, delegating to a real `GenerateGroundedAnswerUseCase`.
 * Extends the class (rather than a plain object literal) because
 * `GenerateGroundedAnswerUseCase` has private fields, so only a
 * subclass — never a structurally-shaped object — is assignable to its
 * type. The dummy dependencies passed to `super()` are never used: this
 * class fully overrides `execute` to delegate to `inner` instead of
 * `super.execute()`.
 */
class CountingGenerateGroundedAnswerUseCase extends GenerateGroundedAnswerUseCase {
  public executeCalls = 0;
  public lastInput: GenerateGroundedAnswerInput | null = null;

  constructor(
    private readonly inner: GenerateGroundedAnswerUseCase,
    private readonly callOrder: string[],
  ) {
    super(
      dummyGenerateGroundedAnswerDeps.retrieveGroundingContextUseCase,
      dummyGenerateGroundedAnswerDeps.promptBuilder,
      dummyGenerateGroundedAnswerDeps.languageModelProvider,
      dummyGenerateGroundedAnswerDeps.groundedAnswerAssembler,
    );
  }

  override async execute(input: GenerateGroundedAnswerInput): Promise<GroundedAnswer> {
    this.executeCalls += 1;
    this.lastInput = input;
    this.callOrder.push("generateGroundedAnswer");
    return this.inner.execute(input);
  }
}

/** Counts calls, records the last input, and appends to a shared call-order log, delegating to a real citation builder. */
class CountingCitationBuilder implements CitationBuilder {
  public buildCalls = 0;
  public lastInput: GroundedAnswer | null = null;

  constructor(
    private readonly inner: CitationBuilder,
    private readonly callOrder: string[],
  ) {}

  async build(answer: GroundedAnswer): Promise<Citation[]> {
    this.buildCalls += 1;
    this.lastInput = answer;
    this.callOrder.push("citationBuilder");
    return this.inner.build(answer);
  }
}

function assertDependsOnlyOnItsTwoDeclaredDependencies(): void {
  console.log("[application] GenerateCitedGroundedAnswerUseCase depends only on GenerateGroundedAnswerUseCase and CitationBuilder...");
  const useCasePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/GenerateCitedGroundedAnswerUseCase.ts",
  );
  const source = readFileSync(useCasePath, "utf8");

  assertTruthy(
    source.includes('from "./GenerateGroundedAnswerUseCase"'),
    "Use case must import GenerateGroundedAnswerUseCase",
  );
  assertTruthy(
    source.includes('from "../citation/CitationBuilder"'),
    "Use case must import the CitationBuilder port",
  );
  const forbiddenReferences = [
    "DefaultCitationBuilder",
    "DefaultGroundedAnswerAssembler",
    "DefaultPromptBuilder",
    "FakeLanguageModelProvider",
    "RetrieveGroundingContextUseCase",
    "BuildGroundedPromptUseCase",
    "GenerateGroundedTextUseCase",
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
    "../prompt/",
    "../ai/",
    "../rag/",
    "../context/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `GenerateCitedGroundedAnswerUseCase.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  generateGroundedAnswerUseCase: GenerateGroundedAnswerUseCase;
  citationBuilder: DefaultCitationBuilder;
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
  const generateGroundedAnswerUseCase = new GenerateGroundedAnswerUseCase(
    retrieveGroundingContextUseCase,
    promptBuilder,
    languageModelProvider,
    groundedAnswerAssembler,
  );
  const citationBuilder = new DefaultCitationBuilder();
  return {
    generateGroundedAnswerUseCase,
    citationBuilder,
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
  const countingGenerate = new CountingGenerateGroundedAnswerUseCase(
    harness.generateGroundedAnswerUseCase,
    callOrder,
  );
  const countingCitationBuilder = new CountingCitationBuilder(
    harness.citationBuilder,
    callOrder,
  );
  const useCase = new GenerateCitedGroundedAnswerUseCase(
    countingGenerate,
    countingCitationBuilder,
  );
  return { useCase, countingGenerate, countingCitationBuilder };
}

async function assertEvidencePresentCallsBothInOrderWithMappedInputsAndUnchangedResult(): Promise<void> {
  console.log("[application] execute calls GenerateGroundedAnswerUseCase then CitationBuilder in order when evidence is present, maps inputs correctly, and returns the CitedGroundedAnswer unchanged...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingGenerate, countingCitationBuilder } =
    buildUseCaseWithCounters(harness, callOrder);

  await seedDocumentAndChunk(harness);

  const input: GenerateCitedGroundedAnswerInput = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };
  const directAnswer = await harness.generateGroundedAnswerUseCase.execute({
    workspaceId: input.workspaceId,
    query: input.query,
    retrievalLimit: input.retrievalLimit,
    maxCharacters: input.maxCharacters,
  });
  const directCitations = await harness.citationBuilder.build(directAnswer);

  const result = await useCase.execute(input);

  assertEqual(countingGenerate.executeCalls, 1, "expected GenerateGroundedAnswerUseCase.execute to be called exactly once");
  assertEqual(countingCitationBuilder.buildCalls, 1, "expected CitationBuilder.build to be called exactly once");
  assertEqual(
    callOrder.join(","),
    "generateGroundedAnswer,citationBuilder",
    "expected GenerateGroundedAnswerUseCase.execute before CitationBuilder.build",
  );

  assertEqual(countingGenerate.lastInput?.workspaceId, WORKSPACE_A, "expected GenerateGroundedAnswerUseCase.execute input.workspaceId to be mapped");
  assertEqual(countingGenerate.lastInput?.query, "aaaaaaaa", "expected GenerateGroundedAnswerUseCase.execute input.query to be mapped");
  assertEqual(countingGenerate.lastInput?.retrievalLimit, 5, "expected GenerateGroundedAnswerUseCase.execute input.retrievalLimit to be mapped");
  assertEqual(countingGenerate.lastInput?.maxCharacters, 10_000, "expected GenerateGroundedAnswerUseCase.execute input.maxCharacters to be mapped");

  assertEqual(countingCitationBuilder.lastInput?.text, directAnswer.text, "expected CitationBuilder.build to receive the grounded answer's text");
  assertEqual(countingCitationBuilder.lastInput?.evidence.length, directAnswer.evidence.length, "expected CitationBuilder.build to receive the grounded answer's evidence");
  assertEqual(countingCitationBuilder.lastInput?.insufficientEvidence, false, "expected CitationBuilder.build to receive insufficientEvidence=false when evidence is present");

  assertEqual(result.answer.text, directAnswer.text, "expected result.answer.text to match a direct call sequence");
  assertEqual(result.answer.insufficientEvidence, directAnswer.insufficientEvidence, "expected result.answer.insufficientEvidence to match a direct call sequence");
  assertEqual(result.answer.evidence.length, directAnswer.evidence.length, "expected result.answer.evidence to match a direct call sequence");
  assertEqual(result.citations.length, directCitations.length, "expected result.citations length to match a direct call sequence");
  assertEqual(result.citations[0]?.id, directCitations[0]?.id, "expected result.citations[0].id to match a direct call sequence");
  assertEqual(result.citations[0]?.excerpt, directCitations[0]?.excerpt, "expected result.citations[0].excerpt to match a direct call sequence");
}

async function assertInsufficientEvidenceStillCallsCitationBuilderWithEmptyCitations(): Promise<void> {
  console.log("[application] execute still calls CitationBuilder for an insufficient-evidence answer, yielding empty citations...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingGenerate, countingCitationBuilder } =
    buildUseCaseWithCounters(harness, callOrder);

  const input: GenerateCitedGroundedAnswerInput = {
    workspaceId: WORKSPACE_A,
    query: "no matching chunks at all",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };

  const result = await useCase.execute(input);

  assertEqual(countingGenerate.executeCalls, 1, "expected GenerateGroundedAnswerUseCase.execute to still be called exactly once");
  assertEqual(countingCitationBuilder.buildCalls, 1, "expected CitationBuilder.build to still be called for an insufficient-evidence answer");
  assertEqual(callOrder.join(","), "generateGroundedAnswer,citationBuilder", "expected both dependencies to run even when evidence is absent");

  assertEqual(countingCitationBuilder.lastInput?.insufficientEvidence, true, "expected CitationBuilder.build to receive an insufficient-evidence answer");
  assertEqual(countingCitationBuilder.lastInput?.evidence.length, 0, "expected CitationBuilder.build to receive empty evidence");
  assertEqual(result.answer.insufficientEvidence, true, "expected the final CitedGroundedAnswer.answer.insufficientEvidence to be true");
  assertEqual(result.citations.length, 0, "expected the final CitedGroundedAnswer.citations to be empty");
}

async function assertRejectsInvalidInputWithoutCallingAnyDependency(): Promise<void> {
  console.log("[application] execute rejects invalid workspaceId/query/retrievalLimit/maxCharacters input without calling either dependency...");
  const harness = buildHarness();
  const callOrder: string[] = [];
  const { useCase, countingGenerate, countingCitationBuilder } =
    buildUseCaseWithCounters(harness, callOrder);

  await assertRejects(
    useCase.execute({ workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateCitedGroundedAnswerInput.workspaceId must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }),
    "GenerateCitedGroundedAnswerInput.query must be a non-empty string",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }),
    "GenerateCitedGroundedAnswerInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 2.5, maxCharacters: 100 }),
    "GenerateCitedGroundedAnswerInput.retrievalLimit must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }),
    "GenerateCitedGroundedAnswerInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    useCase.execute({ workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -5 }),
    "GenerateCitedGroundedAnswerInput.maxCharacters must be a positive integer",
  );
  await assertRejects(
    // @ts-expect-error intentionally invalid for validation coverage
    useCase.execute(null),
    "GenerateCitedGroundedAnswerInput must be an object",
  );

  assertEqual(countingGenerate.executeCalls, 0, "expected GenerateGroundedAnswerUseCase.execute to never be called for invalid input");
  assertEqual(countingCitationBuilder.buildCalls, 0, "expected CitationBuilder.build to never be called for invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnItsTwoDeclaredDependencies();
  await assertEvidencePresentCallsBothInOrderWithMappedInputsAndUnchangedResult();
  await assertInsufficientEvidenceStillCallsCitationBuilderWithEmptyCitations();
  await assertRejectsInvalidInputWithoutCallingAnyDependency();
  console.log("GenerateCitedGroundedAnswerUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
