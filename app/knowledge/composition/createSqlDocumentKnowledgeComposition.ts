import { GenerateCitedGroundedAnswerUseCase } from "../application/GenerateCitedGroundedAnswerUseCase";
import { GenerateGroundedAnswerUseCase } from "../application/GenerateGroundedAnswerUseCase";
import { RetrieveGroundingContextUseCase } from "../application/RetrieveGroundingContextUseCase";
import { FakeLanguageModelProvider } from "../ai/FakeLanguageModelProvider";
import { DefaultCitationBuilder } from "../citation/DefaultCitationBuilder";
import {
  DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
} from "../config/DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "../config/KnowledgeRuntimeConfig";
import { DefaultContextAssembler } from "../context/DefaultContextAssembler";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { InMemoryVectorIndex } from "../embedding/InMemoryVectorIndex";
import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
import { DefaultInMemoryDocumentChunkRepository } from "../persistence/DefaultInMemoryDocumentChunkRepository";
import { SqlKnowledgeDocumentRepository } from "../persistence/SqlKnowledgeDocumentRepository";
import { DefaultPromptBuilder } from "../prompt/DefaultPromptBuilder";
import { DefaultGroundedAnswerAssembler } from "../rag/DefaultGroundedAnswerAssembler";
import { DefaultVectorRetriever } from "../retrieval/DefaultVectorRetriever";
import { DefaultHybridSearch } from "../search/DefaultHybridSearch";
import { DefaultKeywordSearch } from "../search/DefaultKeywordSearch";
import { DefaultRerankedSearch } from "../search/DefaultRerankedSearch";
import { DefaultReranker } from "../search/DefaultReranker";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";
import type { SqlDocumentKnowledgeComposition } from "./SqlDocumentKnowledgeComposition";

/**
 * Composition root with SQL-backed documents via {@link InMemorySqlGateway}
 * + {@link SqlKnowledgeDocumentRepository}. Chunk/vector/cited-answer stack
 * reuses the same in-memory/fake adapters as
 * {@link createInMemoryKnowledgeComposition}.
 */
export function createSqlDocumentKnowledgeComposition(
  config: KnowledgeRuntimeConfig = DEFAULT_KNOWLEDGE_RUNTIME_CONFIG,
): SqlDocumentKnowledgeComposition {
  const sqlGateway = new InMemorySqlGateway();
  const knowledgeDocumentRepository = new SqlKnowledgeDocumentRepository(
    sqlGateway,
  );
  const documentChunkRepository = new DefaultInMemoryDocumentChunkRepository();
  const vectorIndex = new InMemoryVectorIndex();
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
  const languageModelProvider = new FakeLanguageModelProvider();
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
    knowledgeDocumentRepository,
    documentChunkRepository,
    vectorIndex,
    sqlGateway,
  };
}
