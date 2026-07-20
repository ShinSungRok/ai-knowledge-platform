/**
 * Unit-level cases for `DefaultKnowledgeSourceReconciler`.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:reconciler
 */
export const DEFAULT_KNOWLEDGE_SOURCE_RECONCILER_UNIT_CASES = [
  "port_contract",
  "cleans_document_chunks_and_vectors",
  "skips_missing_documents",
  "rejects_source_mismatch_without_further_deletes",
  "workspace_isolation",
  "rejects_invalid_input",
  "imports_only_ports",
] as const;
