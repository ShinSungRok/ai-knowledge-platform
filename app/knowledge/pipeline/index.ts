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
 * update-in-place on re-sync. Real connectors, deletion of documents that
 * disappear from the source, and background scheduling are out of scope
 * until a later task scopes them.
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
