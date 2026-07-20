import { readFileSync } from "node:fs";
import path from "node:path";

import { GenerateCitedGroundedAnswerMcpTool } from "./GenerateCitedGroundedAnswerMcpTool";
import {
  GenerateCitedGroundedAnswerUseCase,
  type GenerateCitedGroundedAnswerInput,
} from "../application/GenerateCitedGroundedAnswerUseCase";
import { GenerateGroundedAnswerUseCase } from "../application/GenerateGroundedAnswerUseCase";
import { RetrieveGroundingContextUseCase } from "../application/RetrieveGroundingContextUseCase";
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
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

const WORKSPACE_A = "workspace-a";
const TOOL_NAME = "generate_cited_grounded_answer";
const TOOL_DESCRIPTION =
  "Generate a workspace-scoped grounded answer with evidence-bound citations.";

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

/** Dummy deps for `GenerateCitedGroundedAnswerUseCase` subclass `super()`; never called. */
const dummyCitedAnswerDeps = {
  generateGroundedAnswerUseCase: new GenerateGroundedAnswerUseCase(
    new RetrieveGroundingContextUseCase(
      { async search(input) { return { query: input.query, chunks: [] }; } },
      { async assemble(input) { return { query: input.query, blocks: [], content: "", truncated: false }; } },
    ),
    { async build(context) { return { systemInstruction: "d", userMessage: context.query }; } },
    { async generate(prompt) { return { text: prompt.userMessage }; } },
    { async assemble() { return { text: "", evidence: [], insufficientEvidence: true }; } },
  ),
  citationBuilder: {
    async build() {
      return [];
    },
  },
};

/**
 * Counts calls and records last input, delegating to a real
 * `GenerateCitedGroundedAnswerUseCase`. Extends the class because its
 * private fields make it non-structurally-typed.
 */
class CountingGenerateCitedGroundedAnswerUseCase extends GenerateCitedGroundedAnswerUseCase {
  public executeCalls = 0;
  public lastInput: GenerateCitedGroundedAnswerInput | null = null;
  public nextError: Error | null = null;

  constructor(private readonly inner: GenerateCitedGroundedAnswerUseCase) {
    super(
      dummyCitedAnswerDeps.generateGroundedAnswerUseCase,
      dummyCitedAnswerDeps.citationBuilder,
    );
  }

  override async execute(
    input: GenerateCitedGroundedAnswerInput,
  ): Promise<CitedGroundedAnswer> {
    this.executeCalls += 1;
    this.lastInput = input;
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
    return this.inner.execute(input);
  }
}

function assertDependsOnlyOnCitedAnswerUseCase(): void {
  console.log("[mcp] GenerateCitedGroundedAnswerMcpTool depends only on GenerateCitedGroundedAnswerUseCase...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/mcp/GenerateCitedGroundedAnswerMcpTool.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "../application/GenerateCitedGroundedAnswerUseCase"'),
    "Tool must import GenerateCitedGroundedAnswerUseCase",
  );
  const forbiddenReferences = [
    "DefaultCitationBuilder",
    "DefaultGroundedAnswerAssembler",
    "DefaultPromptBuilder",
    "FakeLanguageModelProvider",
    "GenerateGroundedAnswerUseCase",
    "RetrieveGroundingContextUseCase",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultContextAssembler",
    "DefaultInMemoryRepository",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "../embedding/",
    "../persistence/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../prompt/",
    "../ai/",
    "../rag/",
    "../citation/",
    "../context/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `GenerateCitedGroundedAnswerMcpTool.ts must not reference "${reference}"`,
    );
  }
}

interface Harness {
  useCase: GenerateCitedGroundedAnswerUseCase;
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
  const generateGroundedAnswerUseCase = new GenerateGroundedAnswerUseCase(
    retrieveGroundingContextUseCase,
    new DefaultPromptBuilder(),
    new FakeLanguageModelProvider(),
    new DefaultGroundedAnswerAssembler(),
  );
  const useCase = new GenerateCitedGroundedAnswerUseCase(
    generateGroundedAnswerUseCase,
    new DefaultCitationBuilder(),
  );
  return {
    useCase,
    chunkRepository,
    vectorIndex,
    embeddingProvider,
    documentRepository,
  };
}

async function seedDocumentAndChunk(harness: Harness): Promise<void> {
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "document text",
  };
  await harness.documentRepository.save(document);

  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: document.id,
    text: "aaaaaaaa",
    order: 0,
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
}

function assertDefinitionConstants(): void {
  console.log("[mcp] GenerateCitedGroundedAnswerMcpTool definition constants are fixed...");
  const harness = buildHarness();
  const tool = new GenerateCitedGroundedAnswerMcpTool(harness.useCase);

  assertEqual(tool.definition.name, TOOL_NAME, "expected definition.name to be fixed");
  assertEqual(tool.definition.description, TOOL_DESCRIPTION, "expected definition.description to be fixed");
  assertEqual(
    tool.definition.inputKeys.join(","),
    "workspaceId,query,retrievalLimit,maxCharacters",
    "expected definition.inputKeys to be fixed",
  );
}

async function assertValidInvokeSuccessPath(): Promise<void> {
  console.log("[mcp] invoke returns ok=true with the use case's CitedGroundedAnswer on valid arguments...");
  const harness = buildHarness();
  await seedDocumentAndChunk(harness);
  const counting = new CountingGenerateCitedGroundedAnswerUseCase(harness.useCase);
  const tool = new GenerateCitedGroundedAnswerMcpTool(counting);

  const args = {
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  };
  const direct = await harness.useCase.execute(args);
  const result = await tool.invoke(args);

  assertEqual(counting.executeCalls, 1, "expected the use case to be called exactly once");
  assertEqual(counting.lastInput?.workspaceId, WORKSPACE_A, "expected workspaceId to be mapped");
  assertEqual(counting.lastInput?.query, "aaaaaaaa", "expected query to be mapped");
  assertEqual(counting.lastInput?.retrievalLimit, 5, "expected retrievalLimit to be mapped");
  assertEqual(counting.lastInput?.maxCharacters, 10_000, "expected maxCharacters to be mapped");
  assertEqual(result.ok, true, "expected ok=true on success");
  assertEqual(result.toolName, TOOL_NAME, "expected toolName to be set on success");
  assertEqual(result.result?.answer.text, direct.answer.text, "expected result.result.answer.text to match a direct use-case call");
  assertEqual(result.result?.citations.length, direct.citations.length, "expected citations to match a direct use-case call");
  assertEqual(result.error, undefined, "expected error to be absent on success");
}

async function assertInvalidInputShortCircuitsWithoutUseCaseCall(): Promise<void> {
  console.log("[mcp] invoke returns ok=false without calling the use case on invalid arguments...");
  const harness = buildHarness();
  const counting = new CountingGenerateCitedGroundedAnswerUseCase(harness.useCase);
  const tool = new GenerateCitedGroundedAnswerMcpTool(counting);

  const cases: Array<{ args: Record<string, unknown>; errorSubstring: string }> = [
    { args: { workspaceId: " ", query: "q", retrievalLimit: 1, maxCharacters: 100 }, errorSubstring: "workspaceId must be a non-empty string" },
    { args: { workspaceId: WORKSPACE_A, query: " ", retrievalLimit: 1, maxCharacters: 100 }, errorSubstring: "query must be a non-empty string" },
    { args: { workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 0, maxCharacters: 100 }, errorSubstring: "retrievalLimit must be a positive integer" },
    { args: { workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1.5, maxCharacters: 100 }, errorSubstring: "retrievalLimit must be a positive integer" },
    { args: { workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: 0 }, errorSubstring: "maxCharacters must be a positive integer" },
    { args: { workspaceId: WORKSPACE_A, query: "q", retrievalLimit: 1, maxCharacters: -1 }, errorSubstring: "maxCharacters must be a positive integer" },
  ];

  for (const testCase of cases) {
    const result = await tool.invoke(testCase.args);
    assertEqual(result.ok, false, `expected ok=false for ${testCase.errorSubstring}`);
    assertEqual(result.toolName, TOOL_NAME, "expected toolName to remain set on error");
    assertTruthy(
      typeof result.error === "string" && result.error.includes(testCase.errorSubstring),
      `expected error to include "${testCase.errorSubstring}", got: ${result.error}`,
    );
    assertEqual(result.result, undefined, "expected result to be absent on invalid input");
  }

  assertEqual(counting.executeCalls, 0, "expected the use case to never be called for invalid input");
}

async function assertUseCaseErrorMappedToNonThrowingResult(): Promise<void> {
  console.log("[mcp] invoke maps a use-case throw into ok=false without rethrowing...");
  const harness = buildHarness();
  await seedDocumentAndChunk(harness);
  const counting = new CountingGenerateCitedGroundedAnswerUseCase(harness.useCase);
  counting.nextError = new Error("use case failed");
  const tool = new GenerateCitedGroundedAnswerMcpTool(counting);

  const result = await tool.invoke({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });

  assertEqual(counting.executeCalls, 1, "expected the use case to still be called once");
  assertEqual(result.ok, false, "expected ok=false when the use case throws");
  assertEqual(result.toolName, TOOL_NAME, "expected toolName to remain set");
  assertEqual(result.error, "use case failed", "expected error to carry the use-case message");
  assertEqual(result.result, undefined, "expected result to be absent when the use case throws");
}

async function main(): Promise<void> {
  assertDependsOnlyOnCitedAnswerUseCase();
  assertDefinitionConstants();
  await assertValidInvokeSuccessPath();
  await assertInvalidInputShortCircuitsWithoutUseCaseCall();
  await assertUseCaseErrorMappedToNonThrowingResult();
  console.log("GenerateCitedGroundedAnswerMcpTool validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
