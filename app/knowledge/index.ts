/**
 * AI Knowledge Platform application core.
 *
 * Bounded context under `app/knowledge/*`, following Clean / Hexagonal
 * Architecture with Domain-Driven Design boundaries inherited from Project1
 * (public-law-ai).
 */
export { KNOWLEDGE_MODULE_DOMAIN } from "./domain";
export type { KnowledgeDocument, KnowledgeSource, DocumentChunk } from "./domain";
export { KNOWLEDGE_MODULE_APPLICATION } from "./application";
export {
  ListKnowledgeDocumentsUseCase,
  ListKnowledgeDocumentsPageUseCase,
  CreateKnowledgeDocumentUseCase,
  UpdateKnowledgeDocumentUseCase,
  DeleteKnowledgeDocumentUseCase,
  SearchKnowledgeDocumentsUseCase,
  ExportKnowledgeDocumentsUseCase,
  CreateKnowledgeSourceUseCase,
  RetrieveKnowledgeChunksUseCase,
  RetrieveHybridKnowledgeChunksUseCase,
  RetrieveGroundingContextUseCase,
  BuildGroundedPromptUseCase,
  GenerateGroundedTextUseCase,
  GenerateGroundedAnswerUseCase,
  GenerateCitedGroundedAnswerUseCase,
} from "./application";
export type {
  ListKnowledgeDocumentsInput,
  ListKnowledgeDocumentsPageInput,
  KnowledgeDocumentsPage,
  KnowledgeDocumentSortField,
  SortOrder,
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput,
  DeleteKnowledgeDocumentInput,
  SearchKnowledgeDocumentsInput,
  KnowledgeDocumentSearchField,
  ExportKnowledgeDocumentsInput,
  ExportKnowledgeDocumentsResult,
  KnowledgeDocumentExportFormat,
  CreateKnowledgeSourceInput,
  RetrieveKnowledgeChunksInput,
  RetrieveHybridKnowledgeChunksInput,
  RetrieveGroundingContextInput,
  BuildGroundedPromptInput,
  GenerateGroundedTextInput,
  GenerateGroundedAnswerInput,
  GenerateCitedGroundedAnswerInput,
} from "./application";
export { KNOWLEDGE_MODULE_REPOSITORY } from "./repository";
export type {
  KnowledgeDocumentRepository,
  KnowledgeSourceRepository,
  DocumentChunkRepository,
} from "./repository";
export { KNOWLEDGE_MODULE_PERSISTENCE } from "./persistence";
export {
  DefaultInMemoryRepository,
  DefaultInMemoryKnowledgeSourceRepository,
  DefaultInMemoryDocumentChunkRepository,
} from "./persistence";
export { KNOWLEDGE_MODULE_PIPELINE } from "./pipeline";
export { KNOWLEDGE_MODULE_EMBEDDING } from "./embedding";
export type { ChunkingService } from "./embedding";
export { FixedSizeDocumentChunker } from "./embedding";
export { EMBEDDING_VECTOR_DIMENSION } from "./embedding";
export type { EmbeddingProvider } from "./embedding";
export { FakeEmbeddingProvider } from "./embedding";
export type { EmbeddingVector, ScoredEmbeddingVector, VectorIndex } from "./embedding";
export { InMemoryVectorIndex } from "./embedding";
export { KNOWLEDGE_MODULE_SEARCH } from "./search";
export type { KeywordSearch, HybridSearch, RerankingInput, Reranker, RerankedSearch } from "./search";
export { DefaultKeywordSearch, DefaultHybridSearch, DefaultReranker, DefaultRerankedSearch } from "./search";
export { KNOWLEDGE_MODULE_RETRIEVAL } from "./retrieval";
export type { RetrievalInput, RetrievalResult, RetrievedChunk, VectorRetriever } from "./retrieval";
export { DefaultVectorRetriever } from "./retrieval";
export { KNOWLEDGE_MODULE_CONTEXT } from "./context";
export type {
  ContextAssemblyInput,
  GroundingContextBlock,
  GroundingContext,
  ContextAssembler,
} from "./context";
export { DefaultContextAssembler } from "./context";
export { KNOWLEDGE_MODULE_PROMPT } from "./prompt";
export type { GroundedPrompt, PromptBuilder } from "./prompt";
export { DefaultPromptBuilder } from "./prompt";
export { KNOWLEDGE_MODULE_CITATION } from "./citation";
export type { Citation, CitedGroundedAnswer, CitationBuilder } from "./citation";
export { DefaultCitationBuilder } from "./citation";
export { KNOWLEDGE_MODULE_RAG } from "./rag";
export type {
  GroundedAnswer,
  GroundedAnswerAssemblyInput,
  GroundedAnswerAssembler,
} from "./rag";
export { DefaultGroundedAnswerAssembler } from "./rag";
export { KNOWLEDGE_MODULE_AI } from "./ai";
export type { GeneratedText, LanguageModelProvider } from "./ai";
export { FakeLanguageModelProvider } from "./ai";
export { KNOWLEDGE_MODULE_MCP } from "./mcp";
export type {
  McpToolName,
  McpToolDefinition,
  McpToolInvokeInput,
  McpToolInvokeResult,
  McpTool,
} from "./mcp";
export { KNOWLEDGE_MODULE_API } from "./api";
export { KNOWLEDGE_MODULE_HTTP } from "./http";
export { KNOWLEDGE_MODULE_SERVER } from "./server";
export { KNOWLEDGE_MODULE_COMPOSITION } from "./composition";
export { KNOWLEDGE_MODULE_CONFIG } from "./config";
export { KNOWLEDGE_MODULE_EVALUATION } from "./evaluation";
export { KNOWLEDGE_MODULE_OBSERVABILITY } from "./observability";
export { KNOWLEDGE_MODULE_RELIABILITY } from "./reliability";
export { KNOWLEDGE_MODULE_SECURITY } from "./security";
export { KNOWLEDGE_MODULE_INFRA } from "./infra";
