/**
 * Unit-level cases for SyncKnowledgeSourcePipeline.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:sync
 *
 * Covered behaviors:
 * - rejects an unregistered source without calling the connector or
 *   saving any document
 * - rejects a source id that is only registered in a different workspace
 * - generates the deterministic canonical id
 *   `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`,
 *   without trimming or otherwise transforming either value
 * - re-syncing the same (source, externalId) pair updates the existing
 *   document in place instead of creating a duplicate
 * - rejects a batch containing a duplicate externalId, saving nothing
 * - rejects the whole batch when a canonical id already exists under a
 *   different sourceId, saving nothing — including otherwise-valid
 *   documents in the same batch
 * - rejects a batch containing an invalid connector document (empty
 *   externalId/title, non-string text), saving nothing from the batch
 * - rejects invalid workspaceId/sourceId pipeline input without calling
 *   the connector
 */
export const SYNC_KNOWLEDGE_SOURCE_PIPELINE_UNIT_CASES = [
  "rejects_missing_source_without_side_effects",
  "rejects_source_from_different_workspace",
  "generates_deterministic_canonical_id",
  "resync_updates_in_place_without_duplication",
  "rejects_duplicate_externalId_within_batch",
  "rejects_canonical_id_conflict_with_different_source",
  "rejects_invalid_connector_document_without_partial_save",
  "rejects_invalid_pipeline_input",
] as const;
