import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import type { KnowledgeSourceChangeDetector } from "./KnowledgeSourceChangeDetector";
import type {
  ConnectorDocument,
  KnowledgeSourceConnector,
} from "./KnowledgeSourceConnector";
import type { KnowledgeSourceReconciler } from "./KnowledgeSourceReconciler";
import type { SyncLifecycleResult } from "./SyncLifecycleResult";

/**
 * Input for a reconciling sync of a single knowledge source.
 */
export interface ReconcilingSyncKnowledgeSourceInput {
  workspaceId: string;
  sourceId: string;
}

/**
 * Production sync pipeline: change detection, upsert of added/updated
 * documents, and reconciliation of removed documents.
 *
 * Orchestrates repository, connector, change-detector, and reconciler
 * ports — never concrete adapters. Canonical id assignment matches
 * {@link SyncKnowledgeSourcePipeline}. The entire fetched batch is
 * validated (duplicate externalId + source conflict) before any save or
 * reconcile. Unchanged documents are not written.
 *
 * The legacy {@link SyncKnowledgeSourcePipeline} is preserved unchanged;
 * this pipeline is the hardening path used by sync job handlers.
 */
export class ReconcilingSyncKnowledgeSourcePipeline {
  constructor(
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly knowledgeSourceConnector: KnowledgeSourceConnector,
    private readonly changeDetector: KnowledgeSourceChangeDetector,
    private readonly reconciler: KnowledgeSourceReconciler,
  ) {}

  async sync(
    input: ReconcilingSyncKnowledgeSourceInput,
  ): Promise<SyncLifecycleResult> {
    const { workspaceId, sourceId } = this.toInput(input);

    const source = await this.knowledgeSourceRepository.findById(
      workspaceId,
      sourceId,
    );
    if (!source) {
      throw new Error(`KnowledgeSource not found: ${sourceId}`);
    }

    const fetched =
      await this.knowledgeSourceConnector.fetchDocuments(source);

    const allDocuments =
      await this.knowledgeDocumentRepository.findAll(workspaceId);
    const existing = allDocuments.filter((doc) => doc.sourceId === sourceId);

    // Validate the entire fetched batch (duplicates + source conflicts)
    // before any detect-driven write or reconcile, matching the legacy
    // sync pipeline's no-partial-write guarantee.
    const validatedFetched = await this.validateFetchedBatch(
      workspaceId,
      sourceId,
      fetched,
    );

    const changeSet = this.changeDetector.detect({
      sourceId,
      fetched: validatedFetched,
      existing,
    });

    const fetchedByExternalId = new Map(
      validatedFetched.map((doc) => [doc.externalId, doc] as const),
    );

    const documentsToSave: KnowledgeDocument[] = [];
    for (const change of changeSet.changes) {
      if (change.kind !== "added" && change.kind !== "updated") {
        continue;
      }
      const connectorDocument = fetchedByExternalId.get(change.externalId);
      if (!connectorDocument) {
        throw new Error(
          `Change set externalId missing from fetched batch: ${change.externalId}`,
        );
      }
      documentsToSave.push({
        workspaceId,
        id: change.documentId,
        sourceId,
        title: connectorDocument.title,
        text: connectorDocument.text,
      });
    }

    for (const document of documentsToSave) {
      await this.knowledgeDocumentRepository.save(document);
    }

    const removedDocumentIds = changeSet.changes
      .filter((change) => change.kind === "removed")
      .map((change) => change.documentId);

    const reconcileResult = await this.reconciler.reconcile({
      workspaceId,
      sourceId,
      removedDocumentIds,
    });

    return {
      sourceId,
      status: "completed",
      fetchedCount: fetched.length,
      addedCount: changeSet.changes.filter((c) => c.kind === "added").length,
      updatedCount: changeSet.changes.filter((c) => c.kind === "updated").length,
      unchangedCount: changeSet.changes.filter((c) => c.kind === "unchanged")
        .length,
      removedDocumentCount: reconcileResult.removedDocumentCount,
      removedChunkCount: reconcileResult.removedChunkCount,
      removedVectorCount: reconcileResult.removedVectorCount,
    };
  }

  /**
   * Validates every connector document in the batch — field shape, unique
   * externalId, and canonical-id source conflicts — without writing.
   */
  private async validateFetchedBatch(
    workspaceId: string,
    sourceId: string,
    connectorDocuments: ConnectorDocument[],
  ): Promise<ConnectorDocument[]> {
    const seenExternalIds = new Set<string>();
    const validated: ConnectorDocument[] = [];

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

      validated.push({ externalId, title, text });
    }

    return validated;
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

  private toInput(
    input: ReconcilingSyncKnowledgeSourceInput,
  ): ReconcilingSyncKnowledgeSourceInput {
    if (!input || typeof input !== "object") {
      throw new Error("ReconcilingSyncKnowledgeSourceInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "ReconcilingSyncKnowledgeSourceInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "ReconcilingSyncKnowledgeSourceInput.sourceId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, sourceId: input.sourceId };
  }
}
