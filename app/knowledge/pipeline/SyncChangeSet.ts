import type { SyncDocumentChange } from "./SyncDocumentChange";

/**
 * Full set of document-level changes detected for one knowledge source.
 */
export interface SyncChangeSet {
  sourceId: string;
  changes: readonly SyncDocumentChange[];
}
