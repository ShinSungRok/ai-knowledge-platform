import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";

/**
 * Input for syncing a single knowledge source.
 */
export interface SyncKnowledgeSourceInput {
  workspaceId: string;
  sourceId: string;
}

/**
 * Result of a sync run. Deliberately minimal — no per-document detail, no
 * connector/storage internals.
 */
export interface SyncKnowledgeSourceResult {
  sourceId: string;
  fetchedCount: number;
  savedCount: number;
}

/**
 * Idempotent Source → Document ingestion pipeline.
 *
 * Orchestrates {@link KnowledgeSourceRepository}, {@link
 * KnowledgeDocumentRepository}, and {@link KnowledgeSourceConnector} — pure
 * Ports, never concrete adapters. The connector only fetches/normalizes
 * origin documents; this pipeline owns canonical id assignment, batch
 * validation, conflict detection, and persistence.
 *
 * Canonical id: `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`,
 * deterministic and collision-free per source — `sourceId`/`externalId` are
 * never trimmed or otherwise transformed before encoding, so re-syncing the
 * exact same connector output always resolves to the exact same document
 * id (idempotent upsert via {@link KnowledgeDocumentRepository.save}).
 *
 * The entire batch is fetched and validated — including conflict checks
 * against already-stored documents — before any `save` call, so a single
 * invalid or conflicting document rejects the whole sync with no partial
 * writes. Documents that disappear from the source are not deleted; that is
 * explicitly out of scope for this pipeline.
 */
export class SyncKnowledgeSourcePipeline {
  constructor(
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly knowledgeSourceConnector: KnowledgeSourceConnector,
  ) {}

  async sync(
    input: SyncKnowledgeSourceInput,
  ): Promise<SyncKnowledgeSourceResult> {
    const { workspaceId, sourceId } = this.toInput(input);

    const source = await this.knowledgeSourceRepository.findById(
      workspaceId,
      sourceId,
    );
    if (!source) {
      throw new Error(`KnowledgeSource not found: ${sourceId}`);
    }

    const connectorDocuments =
      await this.knowledgeSourceConnector.fetchDocuments(source);
    const documentsToSave = await this.buildDocumentsToSave(
      workspaceId,
      sourceId,
      connectorDocuments,
    );

    for (const document of documentsToSave) {
      await this.knowledgeDocumentRepository.save(document);
    }

    return {
      sourceId,
      fetchedCount: connectorDocuments.length,
      savedCount: documentsToSave.length,
    };
  }

  /**
   * Validates and resolves the entire connector batch into documents ready
   * to save — including canonical-id conflict checks against existing
   * storage — without performing any write. Throwing here must never leave
   * a partial write behind.
   */
  private async buildDocumentsToSave(
    workspaceId: string,
    sourceId: string,
    connectorDocuments: ConnectorDocument[],
  ): Promise<KnowledgeDocument[]> {
    const seenExternalIds = new Set<string>();
    const documents: KnowledgeDocument[] = [];

    for (const connectorDocument of connectorDocuments) {
      const { externalId, title, text } =
        this.assertConnectorDocument(connectorDocument);

      if (seenExternalIds.has(externalId)) {
        throw new Error(
          `Duplicate externalId within sync batch: ${externalId}`,
        );
      }
      seenExternalIds.add(externalId);

      const canonicalId = this.toCanonicalId(sourceId, externalId);
      const existing = await this.knowledgeDocumentRepository.findById(
        workspaceId,
        canonicalId,
      );
      if (existing && existing.sourceId !== sourceId) {
        throw new Error(
          `Canonical id already exists under a different source: ${canonicalId}`,
        );
      }

      documents.push({
        workspaceId,
        id: canonicalId,
        sourceId,
        title,
        text,
      });
    }

    return documents;
  }

  private toCanonicalId(sourceId: string, externalId: string): string {
    return `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`;
  }

  private assertConnectorDocument(
    document: ConnectorDocument,
  ): ConnectorDocument {
    if (!document || typeof document !== "object") {
      throw new Error("ConnectorDocument must be an object");
    }
    if (
      typeof document.externalId !== "string" ||
      document.externalId.trim().length === 0
    ) {
      throw new Error("ConnectorDocument.externalId must be a non-empty string");
    }
    if (
      typeof document.title !== "string" ||
      document.title.trim().length === 0
    ) {
      throw new Error("ConnectorDocument.title must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("ConnectorDocument.text must be a string");
    }
    return {
      externalId: document.externalId,
      title: document.title,
      text: document.text,
    };
  }

  private toInput(input: SyncKnowledgeSourceInput): SyncKnowledgeSourceInput {
    if (!input || typeof input !== "object") {
      throw new Error("SyncKnowledgeSourceInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "SyncKnowledgeSourceInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "SyncKnowledgeSourceInput.sourceId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, sourceId: input.sourceId };
  }
}
