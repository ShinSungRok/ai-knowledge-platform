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
  InvokeMcpToolUseCase,
  ExecuteToolCallUseCase,
  RunAgentUseCase,
  AppendMemoryEntryUseCase,
  RecallMemoryEntriesUseCase,
  RunAgentWithMemoryUseCase,
  EnqueueJobUseCase,
  ProcessNextJobUseCase,
  RunRetrievalEvaluationUseCase,
  RunGroundingEvaluationUseCase,
  RunCitationEvaluationUseCase,
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
  InvokeMcpToolInput,
  ExecuteToolCallInput,
  RunAgentInput,
  AppendMemoryEntryInput,
  RecallMemoryEntriesInput,
  RunAgentWithMemoryInput,
  RunAgentWithMemoryResult,
  EnqueueJobInput,
  ProcessNextJobInput,
  RunRetrievalEvaluationInput,
  RunGroundingEvaluationInput,
  RunCitationEvaluationInput,
} from "./application";
export { KNOWLEDGE_MODULE_REPOSITORY } from "./repository";
export type {
  KnowledgeDocumentRepository,
  KnowledgeSourceRepository,
  DocumentChunkRepository,
} from "./repository";
export { KNOWLEDGE_MODULE_PERSISTENCE } from "./persistence";
export { SqlKnowledgeDocumentRepository } from "./persistence";
export {
  DefaultInMemoryRepository,
  DefaultInMemoryKnowledgeSourceRepository,
  DefaultInMemoryDocumentChunkRepository,
} from "./persistence";
export { KNOWLEDGE_MODULE_PIPELINE } from "./pipeline";
export type {
  SyncChangeKind,
  SyncDocumentChange,
  SyncChangeSet,
  SyncLifecycleStatus,
  SyncLifecycleResult,
  KnowledgeSourceChangeDetectInput,
  KnowledgeSourceChangeDetector,
  KnowledgeSourceReconcileInput,
  KnowledgeSourceReconcileResult,
  KnowledgeSourceReconciler,
} from "./pipeline";
export { DefaultKnowledgeSourceChangeDetector } from "./pipeline";
export { DefaultKnowledgeSourceReconciler } from "./pipeline";
export { ReconcilingSyncKnowledgeSourcePipeline } from "./pipeline";
export type { ReconcilingSyncKnowledgeSourceInput } from "./pipeline";
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
  McpToolRegistry,
} from "./mcp";
export {
  GenerateCitedGroundedAnswerMcpTool,
  DefaultMcpToolRegistry,
} from "./mcp";
export { KNOWLEDGE_MODULE_TOOLS } from "./tools";
export type {
  ToolCallStatus,
  ToolCallRequest,
  ToolCallResult,
  ToolExecutor,
} from "./tools";
export { DefaultToolExecutor } from "./tools";
export { KNOWLEDGE_MODULE_AGENT } from "./agent";
export type {
  AgentRole,
  AgentGoal,
  AgentPlanStep,
  AgentPlan,
  AgentStepResult,
  AgentReviewDecision,
  AgentReviewResult,
  AgentExecutionStatus,
  AgentRunResult,
  AgentPlanner,
  AgentStepExecutor,
  AgentReviewer,
  AgentOrchestrator,
} from "./agent";
export { DeterministicKnowledgeAgentPlanner } from "./agent";
export { DefaultAgentStepExecutor } from "./agent";
export { DefaultAgentReviewer } from "./agent";
export { DefaultAgentOrchestrator } from "./agent";
export { KNOWLEDGE_MODULE_MEMORY } from "./memory";
export type {
  MemoryEntryRole,
  MemoryEntry,
  MemoryStore,
  MemoryAppendInput,
} from "./memory";
export { InMemoryMemoryStore } from "./memory";
export { KNOWLEDGE_MODULE_JOBS } from "./jobs";
export type {
  JobType,
  JobStatus,
  JobRecord,
  JobStore,
  JobEnqueueInput,
  JobHandler,
  JobProcessor,
} from "./jobs";
export { InMemoryJobStore } from "./jobs";
export { SyncKnowledgeSourceJobHandler } from "./jobs";
export { DefaultJobProcessor } from "./jobs";
export { ReindexKnowledgeSourceJobHandler } from "./jobs";
export { KNOWLEDGE_MODULE_API } from "./api";
export {
  HealthController,
  CitedGroundedAnswerController,
  createKnowledgeHttpRouter,
} from "./api";
export { KNOWLEDGE_MODULE_HTTP } from "./http";
export type {
  HttpMethod,
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpRouter,
  HttpRoute,
} from "./http";
export { DefaultHttpRouter, ObservingHttpRouter } from "./http";
export { KNOWLEDGE_MODULE_SERVER } from "./server";
export type { KnowledgeServer } from "./server";
export { DefaultKnowledgeServer } from "./server";
export { KNOWLEDGE_MODULE_COMPOSITION } from "./composition";
export type { KnowledgeRuntime, InMemoryKnowledgeComposition } from "./composition";
export { createInMemoryKnowledgeComposition } from "./composition";
export { createInMemoryKnowledgeServer } from "./composition";
export { createOperationsKnowledgeServer } from "./composition";
export { KNOWLEDGE_MODULE_CONFIG } from "./config";
export type { KnowledgeRuntimeConfig } from "./config";
export { DEFAULT_KNOWLEDGE_RUNTIME_CONFIG, loadKnowledgeRuntimeConfig } from "./config";
export { KNOWLEDGE_MODULE_EVALUATION } from "./evaluation";
export type {
  EvaluationCase,
  EvaluationDataset,
  RetrievalCaseScore,
  RetrievalEvaluationMetrics,
  GroundingCaseScore,
  GroundingEvaluationMetrics,
  CitationCaseScore,
  CitationEvaluationMetrics,
  EvaluationReport,
  RetrievalEvaluatorInput,
  RetrievalEvaluator,
  GroundingEvaluatorInput,
  GroundingEvaluator,
  CitationEvaluatorInput,
  CitationEvaluator,
} from "./evaluation";
export { DefaultRetrievalEvaluator } from "./evaluation";
export { DefaultGroundingEvaluator } from "./evaluation";
export { DefaultCitationEvaluator } from "./evaluation";
export { KNOWLEDGE_MODULE_OBSERVABILITY } from "./observability";
export type {
  LogLevel,
  LogEvent,
  Logger,
  MetricPoint,
  Metrics,
} from "./observability";
export { InMemoryLogger, InMemoryMetrics } from "./observability";
export { KNOWLEDGE_MODULE_RELIABILITY } from "./reliability";
export type {
  RetryDecision,
  RetryPolicy,
  TimeoutPolicy,
} from "./reliability";
export { DefaultRetryPolicy, DefaultTimeoutPolicy } from "./reliability";
export { KNOWLEDGE_MODULE_SECURITY } from "./security";
export type { WorkspaceAuthorizer } from "./security";
export { DefaultWorkspaceAuthorizer, HttpWorkspaceGuard } from "./security";
export { KNOWLEDGE_MODULE_INFRA } from "./infra";
export type { SqlParameter, SqlQueryResult, SqlGateway } from "./infra";
