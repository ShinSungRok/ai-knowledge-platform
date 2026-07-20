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
 * `EmbeddingProvider` and upserts the results into `VectorIndex`;
 * `ReindexKnowledgeSourceEmbeddingsPipeline` re-embeds every document
 * belonging to one source by delegating each to
 * `EmbedDocumentChunksPipeline`. Task 70 adds sync change-set / lifecycle
 * contracts (`SyncChangeKind`, `SyncDocumentChange`, `SyncChangeSet`,
 * `SyncLifecycleStatus`, `SyncLifecycleResult`) plus the
 * `KnowledgeSourceChangeDetector` and `KnowledgeSourceReconciler` ports
 * for production sync hardening — adapters and reconciling orchestration
 * are later tasks. Real connectors, automatic chunking/embedding during
 * sync, and background scheduling remain out of scope until scoped.
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
export type { SyncChangeKind } from "./SyncChangeKind";
export type { SyncDocumentChange } from "./SyncDocumentChange";
export type { SyncChangeSet } from "./SyncChangeSet";
export type { SyncLifecycleStatus } from "./SyncLifecycleStatus";
export type { SyncLifecycleResult } from "./SyncLifecycleResult";
export type {
  KnowledgeSourceChangeDetectInput,
  KnowledgeSourceChangeDetector,
} from "./KnowledgeSourceChangeDetector";
export type {
  KnowledgeSourceReconcileInput,
  KnowledgeSourceReconcileResult,
  KnowledgeSourceReconciler,
} from "./KnowledgeSourceReconciler";
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
export {
  ReindexKnowledgeSourceEmbeddingsPipeline,
  type ReindexKnowledgeSourceEmbeddingsInput,
  type ReindexKnowledgeSourceEmbeddingsResult,
} from "./ReindexKnowledgeSourceEmbeddingsPipeline";
