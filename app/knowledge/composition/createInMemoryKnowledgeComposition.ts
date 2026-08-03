import { GenerateCitedGroundedAnswerUseCase } from "../application/GenerateCitedGroundedAnswerUseCase";
import { GenerateGroundedAnswerUseCase } from "../application/GenerateGroundedAnswerUseCase";
import { RetrieveGroundingContextUseCase } from "../application/RetrieveGroundingContextUseCase";
import { DefaultCitationBuilder } from "../citation/DefaultCitationBuilder";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultContextAssembler } from "../context/DefaultContextAssembler";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { DefaultMcpJsonRpcHandler } from "../mcp/DefaultMcpJsonRpcHandler";
import { DefaultMcpToolRegistry } from "../mcp/DefaultMcpToolRegistry";
import { GenerateCitedGroundedAnswerMcpTool } from "../mcp/GenerateCitedGroundedAnswerMcpTool";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import { DefaultPromptBuilder } from "../prompt/DefaultPromptBuilder";
import { DefaultGroundedAnswerAssembler } from "../rag/DefaultGroundedAnswerAssembler";
import { MIN_VECTOR_SIMILARITY } from "../retrieval/MIN_VECTOR_SIMILARITY";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { ThresholdFilteringVectorRetriever } from "../retrieval/ThresholdFilteringVectorRetriever";
import { DefaultHybridSearch } from "../search/DefaultHybridSearch";
import { DefaultKeywordSearch } from "../search/DefaultKeywordSearch";
import { DefaultRerankedSearch } from "../search/DefaultRerankedSearch";
import { LlmRerankedSearch } from "../search/LlmRerankedSearch";
import { MAX_RERANK_RETRY_ATTEMPTS } from "../search/MAX_RERANK_RETRY_ATTEMPTS";
import { MIN_KEYWORD_COVERAGE } from "../search/MIN_KEYWORD_COVERAGE";
import { MIN_LLM_RELEVANCE_SCORE } from "../search/MIN_LLM_RELEVANCE_SCORE";
import { MIN_RELEVANCE_SCORE } from "../search/MIN_RELEVANCE_SCORE";
import { NormalizedReranker } from "../search/NormalizedReranker";
import { RetryingRerankedSearch } from "../search/RetryingRerankedSearch";
import { ThresholdFilteringKeywordSearch } from "../search/ThresholdFilteringKeywordSearch";
import { ThresholdFilteringRerankedSearch } from "../search/ThresholdFilteringRerankedSearch";
import {
  createEmbeddingProvider,
  type EmbeddingProviderOption,
} from "./createEmbeddingProvider";
import {
  createLanguageModelProvider,
  type LlmProviderOption,
} from "./createLanguageModelProvider";
import type { InMemoryKnowledgeComposition } from "./InMemoryKnowledgeComposition";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

export type CreateInMemoryKnowledgeCompositionOptions = {
  llm?: LlmProviderOption;
  embedding?: EmbeddingProviderOption;
};

/**
 * Builds an in-memory/fake composition root wired through the cited-answer
 * application use-case chain. Concrete adapters are imported only here.
 * LLM defaults to Fake; pass `{ llm: { type: "http", config } }` for HTTP.
 */
export function createInMemoryKnowledgeComposition(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
  options: CreateInMemoryKnowledgeCompositionOptions = {},
): InMemoryKnowledgeComposition {
  const knowledgeDocumentRepository = new DefaultInMemoryRepository();
  const documentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const vectorIndex = new InMemoryVectorIndex();
  const embeddingProvider = createEmbeddingProvider(
    options.embedding ?? { type: "fake" },
  );

  const vectorRetriever = new ThresholdFilteringVectorRetriever(
    new DefaultVectorRetriever(embeddingProvider, vectorIndex, documentChunkRepository),
    MIN_VECTOR_SIMILARITY,
  );
  const keywordSearch = new ThresholdFilteringKeywordSearch(
    new DefaultKeywordSearch(documentChunkRepository),
    MIN_KEYWORD_COVERAGE,
  );
  const hybridSearch = new DefaultHybridSearch(vectorRetriever, keywordSearch);
  const languageModelProvider = createLanguageModelProvider(
    options.llm ?? { type: "fake" },
  );
  const reranker = new NormalizedReranker();
  const baseRerankedSearch = new DefaultRerankedSearch(hybridSearch, reranker);
  const vectorKeywordFilteredSearch = new ThresholdFilteringRerankedSearch(
    baseRerankedSearch,
    MIN_RELEVANCE_SCORE,
  );
  const llmJudgedSearch = new LlmRerankedSearch(
    vectorKeywordFilteredSearch,
    languageModelProvider,
  );
  const thresholdFilteredLlmRerankedSearch = new ThresholdFilteringRerankedSearch(
    llmJudgedSearch,
    MIN_LLM_RELEVANCE_SCORE,
  );
  const rerankedSearch = new RetryingRerankedSearch(
    thresholdFilteredLlmRerankedSearch,
    MAX_RERANK_RETRY_ATTEMPTS,
  );
  const contextAssembler = new DefaultContextAssembler(
    knowledgeDocumentRepository,
  );
  const retrieveGroundingContextUseCase = new RetrieveGroundingContextUseCase(
    rerankedSearch,
    contextAssembler,
  );
  const promptBuilder = new DefaultPromptBuilder();
  const groundedAnswerAssembler = new DefaultGroundedAnswerAssembler();
  const generateGroundedAnswerUseCase = new GenerateGroundedAnswerUseCase(
    retrieveGroundingContextUseCase,
    promptBuilder,
    languageModelProvider,
    groundedAnswerAssembler,
  );
  const citationBuilder = new DefaultCitationBuilder();
  const generateCitedGroundedAnswerUseCase =
    new GenerateCitedGroundedAnswerUseCase(
      generateGroundedAnswerUseCase,
      citationBuilder,
    );
  const mcpTool = new GenerateCitedGroundedAnswerMcpTool(
    generateCitedGroundedAnswerUseCase,
  );
  const mcpRegistry = new DefaultMcpToolRegistry([mcpTool]);
  const mcpJsonRpcHandler = new DefaultMcpJsonRpcHandler(mcpRegistry);

  const runtime: KnowledgeRuntime = {
    config,
    async generateCitedGroundedAnswer(input) {
      return generateCitedGroundedAnswerUseCase.execute({
        workspaceId: input.workspaceId,
        query: input.query,
        retrievalLimit: input.retrievalLimit ?? config.defaultRetrievalLimit,
        maxCharacters: input.maxCharacters ?? config.defaultMaxCharacters,
      });
    },
  };

  return {
    runtime,
    mcpJsonRpcHandler,
    languageModelProvider,
    embeddingProvider,
    knowledgeDocumentRepository,
    documentChunkRepository,
    vectorIndex,
  };
}
