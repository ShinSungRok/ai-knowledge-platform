import { GenerateCitedGroundedAnswerUseCase } from "../application/GenerateCitedGroundedAnswerUseCase";
import { GenerateGroundedAnswerUseCase } from "../application/GenerateGroundedAnswerUseCase";
import { RetrieveGroundingContextUseCase } from "../application/RetrieveGroundingContextUseCase";
import { DefaultCitationBuilder } from "../citation/DefaultCitationBuilder";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultContextAssembler } from "../context/DefaultContextAssembler";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { OpenSearchVectorIndex } from "../embedding/OpenSearchVectorIndex";
import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import { DefaultMcpJsonRpcHandler } from "../mcp/DefaultMcpJsonRpcHandler";
import { DefaultMcpToolRegistry } from "../mcp/DefaultMcpToolRegistry";
import { GenerateCitedGroundedAnswerMcpTool } from "../mcp/GenerateCitedGroundedAnswerMcpTool";
import { SqlDocumentChunkRepository } from "../persistence/SqlDocumentChunkRepository";
import { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import { SqlKnowledgeSourceRepository } from "../persistence/SqlKnowledgeSourceRepository";
import { DefaultPromptBuilder } from "../prompt/DefaultPromptBuilder";
import { DefaultGroundedAnswerAssembler } from "../rag/DefaultGroundedAnswerAssembler";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { DefaultHybridSearch } from "../search/DefaultHybridSearch";
import { DefaultKeywordSearch } from "../search/DefaultKeywordSearch";
import { DefaultRerankedSearch } from "../search/DefaultRerankedSearch";
import { DefaultReranker } from "../search/DefaultReranker";
import {
  createLanguageModelProvider,
  type LlmProviderOption,
} from "./createLanguageModelProvider";
import type {
  CreateOpenSearchKnowledgeCompositionOpenSearchOption,
} from "./createOpenSearchVectorIndexFromEnv";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";
import type { SqlKnowledgeComposition } from "./SqlKnowledgeComposition";

export type CreateOpenSearchKnowledgeCompositionOptions = {
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
  /** OpenSearch VectorIndex config + transport (Fake or Fetch). */
  openSearch: CreateOpenSearchKnowledgeCompositionOpenSearchOption;
};

/**
 * SQL Source-of-Truth (document/source/chunk) with OpenSearch VectorIndex.
 *
 * Documents remain on {@link InMemorySqlGateway}; only the rebuildable vector
 * search index uses OpenSearch. Default validate / operations paths stay on
 * {@link createSqlKnowledgeComposition} / InMemory — this factory is optional.
 */
export function createOpenSearchKnowledgeComposition(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
  options: CreateOpenSearchKnowledgeCompositionOptions,
): SqlKnowledgeComposition {
  const sqlGateway = new InMemorySqlGateway();
  const knowledgeDocumentRepository = new SqlKnowledgeDocumentRepository(
    sqlGateway,
  );
  const knowledgeSourceRepository = new SqlKnowledgeSourceRepository(
    sqlGateway,
  );
  const documentChunkRepository = new SqlDocumentChunkRepository(sqlGateway);
  const vectorIndex = new OpenSearchVectorIndex(
    options.openSearch.config,
    options.openSearch.transport,
  );
  const embeddingProvider = new FakeEmbeddingProvider();

  const vectorRetriever = new DefaultVectorRetriever(
    embeddingProvider,
    vectorIndex,
    documentChunkRepository,
  );
  const keywordSearch = new DefaultKeywordSearch(documentChunkRepository);
  const hybridSearch = new DefaultHybridSearch(vectorRetriever, keywordSearch);
  const reranker = new DefaultReranker();
  const rerankedSearch = new DefaultRerankedSearch(hybridSearch, reranker);
  const contextAssembler = new DefaultContextAssembler(
    knowledgeDocumentRepository,
  );
  const retrieveGroundingContextUseCase = new RetrieveGroundingContextUseCase(
    rerankedSearch,
    contextAssembler,
  );
  const promptBuilder = new DefaultPromptBuilder();
  const languageModelProvider = createLanguageModelProvider(
    options.llm ?? { type: "fake" },
  );
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
    knowledgeDocumentRepository,
    knowledgeSourceRepository,
    documentChunkRepository,
    vectorIndex,
    sqlGateway,
  };
}
