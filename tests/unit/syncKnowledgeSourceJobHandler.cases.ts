/**
 * Unit-level cases for SyncKnowledgeSourceJobHandler.
 *
 * Executed via:
 *
 *   pnpm validate:jobs:sync-handler
 */
export const SYNC_KNOWLEDGE_SOURCE_JOB_HANDLER_UNIT_CASES = [
  "depends_only_on_sync_pipeline",
  "execute_returns_sync_result_shape",
] as const;
