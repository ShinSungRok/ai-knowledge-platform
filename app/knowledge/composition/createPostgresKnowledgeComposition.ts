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
import { SqlVectorIndex } from "../embedding/SqlVectorIndex";
import { applyKnowledgeSchema } from "../infra/applyKnowledgeSchema";
import type { PostgresPool } from "../infra/PostgresPool";
import { PostgresSqlGateway } from "../infra/PostgresSqlGateway";
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
import type { KnowledgeRuntime } from "./KnowledgeRuntime";
import type { SqlKnowledgeComposition } from "./SqlKnowledgeComposition";

export type CreatePostgresKnowledgeCompositionOptions = {
  pool: PostgresPool;
  config?: KnowledgeRuntimeConfig;
  /** When not `false`, applies knowledge schema DDL before wiring repos. */
  applySchema?: boolean;
  /** Defaults to Fake LLM. */
  llm?: LlmProviderOption;
};

/**
 * Composition root with SQL-backed document/source/chunk/vector index over
 * {@link PostgresSqlGateway}. Cited-answer stack reuses fake embedding/search
 * adapters; LLM defaults to Fake. Caller owns the pool lifecycle.
 *
 * Default in-memory and InMemorySqlGateway SQL paths remain available.
 */
export async function createPostgresKnowledgeComposition(
  options: CreatePostgresKnowledgeCompositionOptions,
): Promise<SqlKnowledgeComposition> {
  const config = options.config ?? DEFAULT_KNOWLEDGE_RUNTIME_CONFIG;
  const sqlGateway = new PostgresSqlGateway(options.pool);
  if (options.applySchema !== false) {
    await applyKnowledgeSchema(sqlGateway);
  }

  const knowledgeDocumentRepository = new SqlKnowledgeDocumentRepository(
    sqlGateway,
  );
  const knowledgeSourceRepository = new SqlKnowledgeSourceRepository(
    sqlGateway,
  );
  const documentChunkRepository = new SqlDocumentChunkRepository(sqlGateway);
  const vectorIndex = new SqlVectorIndex(sqlGateway);
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
