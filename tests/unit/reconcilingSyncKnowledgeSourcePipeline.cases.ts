/**
 * Unit-level cases for `ReconcilingSyncKnowledgeSourcePipeline`.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:reconciling-sync
 */
export const RECONCILING_SYNC_KNOWLEDGE_SOURCE_PIPELINE_UNIT_CASES = [
  "saves_added_and_updated_skips_unchanged",
  "reconciles_removed_documents",
  "pre_write_validation_failure_leaves_no_writes",
  "rejects_source_conflict_with_no_writes",
  "imports_only_ports",
] as const;
