/**
 * Classification of how a single document changed between a connector fetch
 * and the existing source-scoped document set.
 */
export type SyncChangeKind = "added" | "updated" | "unchanged" | "removed";
