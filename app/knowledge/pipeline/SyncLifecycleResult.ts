import type { SyncLifecycleStatus } from "./SyncLifecycleStatus";

/**
 * Summary of a production sync lifecycle run — counts plus optional error.
 *
 * Deliberately excludes per-document detail and connector/storage internals.
 */
export interface SyncLifecycleResult {
  sourceId: string;
  status: SyncLifecycleStatus;
  fetchedCount: number;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  removedDocumentCount: number;
  removedChunkCount: number;
  removedVectorCount: number;
  error?: string;
}
