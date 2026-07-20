import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type {
  KnowledgeSourceChangeDetectInput,
  KnowledgeSourceChangeDetector,
} from "./KnowledgeSourceChangeDetector";
import type { ConnectorDocument } from "./KnowledgeSourceConnector";
import type { SyncChangeKind } from "./SyncChangeKind";
import type { SyncChangeSet } from "./SyncChangeSet";
import type { SyncDocumentChange } from "./SyncDocumentChange";

const KIND_ORDER: Readonly<Record<SyncChangeKind, number>> = {
  added: 0,
  updated: 1,
  unchanged: 2,
  removed: 3,
};

/**
 * Deterministic {@link KnowledgeSourceChangeDetector}: compares a connector
 * fetch batch against existing source-scoped documents and classifies each
 * as added / updated / unchanged / removed.
 *
 * Pure decision logic — no constructor dependencies and no repository,
 * connector, or vector adapter usage. Canonical document ids match
 * {@link SyncKnowledgeSourcePipeline}:
 * `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`
 * with no trim/transform of either value before encoding.
 *
 * `changes` are ordered by kind (added → updated → unchanged → removed),
 * then by `documentId` ascending within each kind.
 */
export class DefaultKnowledgeSourceChangeDetector
  implements KnowledgeSourceChangeDetector
{
  detect(input: KnowledgeSourceChangeDetectInput): SyncChangeSet {
    const { sourceId, fetched, existing } = this.toInput(input);

    const seenExternalIds = new Set<string>();
    const fetchedByCanonicalId = new Map<
      string,
      { externalId: string; title: string; text: string }
    >();

    for (const connectorDocument of fetched) {
      const { externalId, title, text } =
        this.assertConnectorDocument(connectorDocument);
      if (seenExternalIds.has(externalId)) {
        throw new Error(
          `Duplicate externalId within sync batch: ${externalId}`,
        );
      }
      seenExternalIds.add(externalId);
      const documentId = this.toCanonicalId(sourceId, externalId);
      fetchedByCanonicalId.set(documentId, { externalId, title, text });
    }

    const existingById = new Map<string, KnowledgeDocument>();
    for (const document of existing) {
      const validated = this.assertExistingDocument(document);
      if (validated.sourceId !== sourceId) {
        continue;
      }
      existingById.set(validated.id, validated);
    }

    const changes: SyncDocumentChange[] = [];

    for (const [documentId, fetchedDoc] of fetchedByCanonicalId) {
      const existingDoc = existingById.get(documentId);
      if (!existingDoc) {
        changes.push({
          kind: "added",
          documentId,
          externalId: fetchedDoc.externalId,
        });
        continue;
      }
      if (
        existingDoc.title === fetchedDoc.title &&
        existingDoc.text === fetchedDoc.text
      ) {
        changes.push({
          kind: "unchanged",
          documentId,
          externalId: fetchedDoc.externalId,
        });
      } else {
        changes.push({
          kind: "updated",
          documentId,
          externalId: fetchedDoc.externalId,
        });
      }
    }

    for (const [documentId, existingDoc] of existingById) {
      if (fetchedByCanonicalId.has(documentId)) {
        continue;
      }
      changes.push({
        kind: "removed",
        documentId,
        externalId: this.externalIdFromCanonical(documentId, sourceId),
      });
    }

    changes.sort((a, b) => {
      const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
      if (kindDiff !== 0) {
        return kindDiff;
      }
      return a.documentId < b.documentId
        ? -1
        : a.documentId > b.documentId
          ? 1
          : 0;
    });

    return { sourceId, changes };
  }

  private toCanonicalId(sourceId: string, externalId: string): string {
    return `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`;
  }

  /**
   * Best-effort reverse of the canonical id for removed rows. Removed
   * documents have no fetched `externalId`; when the id was produced by
   * {@link toCanonicalId} for this `sourceId`, decode the suffix. Otherwise
   * fall back to an empty string so the change record still carries the
   * required field without inventing provenance.
   */
  private externalIdFromCanonical(documentId: string, sourceId: string): string {
    const prefix = `${encodeURIComponent(sourceId)}:`;
    if (!documentId.startsWith(prefix)) {
      return "";
    }
    try {
      return decodeURIComponent(documentId.slice(prefix.length));
    } catch {
      return "";
    }
  }

  private toInput(
    input: KnowledgeSourceChangeDetectInput,
  ): KnowledgeSourceChangeDetectInput {
    if (!input || typeof input !== "object") {
      throw new Error("KnowledgeSourceChangeDetectInput must be an object");
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "KnowledgeSourceChangeDetectInput.sourceId must be a non-empty string",
      );
    }
    if (!Array.isArray(input.fetched)) {
      throw new Error(
        "KnowledgeSourceChangeDetectInput.fetched must be an array",
      );
    }
    if (!Array.isArray(input.existing)) {
      throw new Error(
        "KnowledgeSourceChangeDetectInput.existing must be an array",
      );
    }
    return {
      sourceId: input.sourceId,
      fetched: input.fetched,
      existing: input.existing,
    };
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

  private assertExistingDocument(document: KnowledgeDocument): KnowledgeDocument {
    if (!document || typeof document !== "object") {
      throw new Error("KnowledgeDocument must be an object");
    }
    if (typeof document.id !== "string" || document.id.trim().length === 0) {
      throw new Error("KnowledgeDocument.id must be a non-empty string");
    }
    if (
      typeof document.sourceId !== "string" ||
      document.sourceId.trim().length === 0
    ) {
      throw new Error("KnowledgeDocument.sourceId must be a non-empty string");
    }
    if (
      typeof document.title !== "string" ||
      document.title.trim().length === 0
    ) {
      throw new Error("KnowledgeDocument.title must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("KnowledgeDocument.text must be a string");
    }
    return document;
  }
}
