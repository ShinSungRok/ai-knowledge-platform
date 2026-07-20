/**
 * Module: `app/knowledge/pipeline`
 *
 * Ingestion pipelines from external knowledge sources.
 *
 * `KnowledgeSourceConnector` is the outbound port for fetching normalized
 * documents from a `KnowledgeSource`; `FakeKnowledgeSourceConnector` is a
 * dependency-free fixture-backed adapter for validation.
 * `SyncKnowledgeSourcePipeline` orchestrates the connector plus the source
 * and document repository ports into an idempotent sync: deterministic
 * canonical document ids, whole-batch validation before any write, and
 * update-in-place on re-sync. `ChunkKnowledgeDocumentPipeline` converts a
 * single already-stored document into chunks via the `ChunkingService`
 * port and fully replaces that document's chunk set;
 * `RechunkKnowledgeSourcePipeline` re-chunks every document belonging to
 * one source by delegating each to `ChunkKnowledgeDocumentPipeline`.
 * `EmbedDocumentChunksPipeline` embeds one document's chunks via
 * `EmbeddingProvider` and upserts the results into `VectorIndex`. Real
 * connectors, deletion of documents/chunks that disappear from the source,
 * automatic chunking/embedding during sync, and background scheduling are
 * out of scope until a later task scopes them.
 */
export const KNOWLEDGE_MODULE_PIPELINE = "app/knowledge/pipeline" as const;

export type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";
export {
  FakeKnowledgeSourceConnector,
  type FakeKnowledgeSourceFixture,
} from "./FakeKnowledgeSourceConnector";
export {
  SyncKnowledgeSourcePipeline,
  type SyncKnowledgeSourceInput,
  type SyncKnowledgeSourceResult,
} from "./SyncKnowledgeSourcePipeline";
export {
  ChunkKnowledgeDocumentPipeline,
  type ChunkKnowledgeDocumentInput,
  type ChunkKnowledgeDocumentResult,
} from "./ChunkKnowledgeDocumentPipeline";
export {
  RechunkKnowledgeSourcePipeline,
  type RechunkKnowledgeSourceInput,
  type RechunkKnowledgeSourceResult,
} from "./RechunkKnowledgeSourcePipeline";
export {
  EmbedDocumentChunksPipeline,
  type EmbedDocumentChunksInput,
  type EmbedDocumentChunksResult,
} from "./EmbedDocumentChunksPipeline";
