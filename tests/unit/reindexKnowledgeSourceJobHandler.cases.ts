/** Unit cases for ReindexKnowledgeSourceJobHandler. */
export const REINDEX_KNOWLEDGE_SOURCE_JOB_HANDLER_UNIT_CASES = [
  "depends_only_on_rechunk_and_reindex_pipelines",
  "rechunk_then_reindex_ordering",
  "rechunk_failure_short_circuits",
  "processor_completes_reindex_job",
] as const;
