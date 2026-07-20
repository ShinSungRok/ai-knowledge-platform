/**
 * Unit-level cases for `DefaultKnowledgeSourceChangeDetector`.
 *
 * Executed via:
 *
 *   pnpm validate:pipeline:change-detector
 */
export const DEFAULT_KNOWLEDGE_SOURCE_CHANGE_DETECTOR_UNIT_CASES = [
  "port_contract",
  "classifies_added_updated_unchanged_removed",
  "ignores_other_source_existing_documents",
  "orders_by_kind_then_document_id",
  "deterministic_across_repeated_calls",
  "uses_sync_pipeline_canonical_id_formula",
  "rejects_duplicate_external_id",
  "rejects_invalid_input",
  "imports_no_adapters",
] as const;
