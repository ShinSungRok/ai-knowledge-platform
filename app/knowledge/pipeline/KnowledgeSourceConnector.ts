import type { KnowledgeSource } from "../domain/KnowledgeSource";

/**
 * A single normalized document as fetched from an external knowledge
 * source, before it becomes a `KnowledgeDocument`. `externalId` identifies
 * the document within its origin system.
 *
 * Deliberately excludes `workspaceId`/`sourceId`: the caller already knows
 * which `KnowledgeSource` it queried, so this contract stays scoped to the
 * external document data only — no provenance or identity policy lives
 * here. Assigning a canonical `KnowledgeDocument.id` from `externalId` is a
 * later sync-policy concern, out of scope for this port.
 */
export interface ConnectorDocument {
  externalId: string;
  title: string;
  text: string;
}

/**
 * Outbound port for fetching normalized documents from an external
 * knowledge source. Concrete adapters (fake, and later real HTTP/file/DB
 * connectors) live under `app/knowledge/pipeline` and are wired only at the
 * composition root.
 *
 * A connector only fetches and normalizes origin documents for a given
 * `KnowledgeSource` — it never persists, syncs, or verifies
 * `KnowledgeDocument` provenance. Those remain application-layer
 * responsibilities (see `CreateKnowledgeDocumentUseCase`).
 */
export interface KnowledgeSourceConnector {
  fetchDocuments(source: KnowledgeSource): Promise<ConnectorDocument[]>;
}
