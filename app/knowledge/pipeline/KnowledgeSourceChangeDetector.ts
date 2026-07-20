import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { ConnectorDocument } from "./KnowledgeSourceConnector";
import type { SyncChangeSet } from "./SyncChangeSet";

/**
 * Input for detecting document-level changes between a connector fetch and
 * the existing source-scoped document set.
 */
export interface KnowledgeSourceChangeDetectInput {
  sourceId: string;
  fetched: readonly ConnectorDocument[];
  existing: readonly KnowledgeDocument[];
}

/**
 * Pure decision port: classify fetched vs existing documents into a
 * {@link SyncChangeSet}. Implementations must not depend on repositories,
 * connectors, or vector adapters.
 */
export interface KnowledgeSourceChangeDetector {
  detect(input: KnowledgeSourceChangeDetectInput): SyncChangeSet;
}
