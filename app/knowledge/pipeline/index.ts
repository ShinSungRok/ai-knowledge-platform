/**
 * Module: `app/knowledge/pipeline`
 *
 * Ingestion pipelines from external knowledge sources.
 *
 * `KnowledgeSourceConnector` is the outbound port for fetching normalized
 * documents from a `KnowledgeSource`; `FakeKnowledgeSourceConnector` is a
 * dependency-free fixture-backed adapter for validation. Real connectors,
 * sync policy, and canonical document identity are out of scope until a
 * later task scopes them.
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
