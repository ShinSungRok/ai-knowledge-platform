import { GenerateCitedGroundedAnswerUseCase } from "../application/GenerateCitedGroundedAnswerUseCase";
import { GenerateGroundedAnswerUseCase } from "../application/GenerateGroundedAnswerUseCase";
import { RetrieveGroundingContextUseCase } from "../application/RetrieveGroundingContextUseCase";
import { DefaultCitationBuilder } from "../citation/DefaultCitationBuilder";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultContextAssembler } from "../context/DefaultContextAssembler";
import { OpenSearchVectorIndex } from "../embedding/OpenSearchVectorIndex";
import { applyKnowledgeSchema } from "../infra/applyKnowledgeSchema";
import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import type { PostgresPool } from "../infra/PostgresPool";
import { PostgresSqlGateway } from "../infra/PostgresSqlGateway";
import type { SqlGateway } from "../infra/SqlGateway";
import { DefaultMcpJsonRpcHandler } from "../mcp/DefaultMcpJsonRpcHandler";
import { DefaultMcpToolRegistry } from "../mcp/DefaultMcpToolRegistry";
import { GenerateCitedGroundedAnswerMcpTool } from "../mcp/GenerateCitedGroundedAnswerMcpTool";
import { SqlDocumentChunkRepository } from "../persistence/SqlDocumentChunkRepository";
import { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import { SqlKnowledgeSourceRepository } from "../persistence/SqlKnowledgeSourceRepository";
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
import { ThresholdFilteringKeywordSearch } from "../search/ThresholdFilteringKeywordSearch";
import { MIN_RELEVANCE_SCORE } from "../search/MIN_RELEVANCE_SCORE";
import { NormalizedReranker } from "../search/NormalizedReranker";
import { RetryingRerankedSearch } from "../search/RetryingRerankedSearch";
import { ThresholdFilteringRerankedSearch } from "../search/ThresholdFilteringRerankedSearch";
import {
  createEmbeddingProvider,
  type EmbeddingProviderOption,
} from "./createEmbeddingProvider";
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
  /** Defaults to Fake embedding. */
  embedding?: EmbeddingProviderOption;
  /** OpenSearch VectorIndex config + transport (Fake or Fetch). */
  openSearch: CreateOpenSearchKnowledgeCompositionOpenSearchOption;
  /**
   * When set, document/source/chunk SoT uses {@link PostgresSqlGateway}.
   * When unset, SoT uses {@link InMemorySqlGateway} (Fake smokes without Postgres).
   * VectorIndex is always OpenSearch.
   */
  pool?: PostgresPool;
  /** When `pool` is set and not `false`, applies knowledge schema DDL first. */
  applySchema?: boolean;
};

/**
 * SQL Source-of-Truth (document/source/chunk) with OpenSearch VectorIndex.
 *
 * Default SoT is {@link InMemorySqlGateway}; pass `pool` for Postgres SoT while
 * keeping OpenSearch as the rebuildable vector index. Default validate /
 * operations paths stay on InMemory / Postgres-only factories — this factory
 * is optional for host OpenSearch wiring.
 */
export async function createOpenSearchKnowledgeComposition(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
  options: CreateOpenSearchKnowledgeCompositionOptions,
): Promise<SqlKnowledgeComposition> {
  let sqlGateway: SqlGateway;
  if (options.pool !== undefined) {
    sqlGateway = new PostgresSqlGateway(options.pool);
    if (options.applySchema !== false) {
      await applyKnowledgeSchema(sqlGateway);
    }
  } else {
    sqlGateway = new InMemorySqlGateway();
  }

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
    knowledgeSourceRepository,
    documentChunkRepository,
    vectorIndex,
    sqlGateway,
  };
}
