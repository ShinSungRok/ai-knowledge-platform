import type { SyncChangeKind } from "./SyncChangeKind";

/**
 * One document-level change within a {@link SyncChangeSet}.
 *
 * `documentId` is the canonical knowledge-document id; `externalId` is the
 * origin-system id carried for provenance in the change set.
 */
export interface SyncDocumentChange {
  kind: SyncChangeKind;
  documentId: string;
  externalId: string;
}
