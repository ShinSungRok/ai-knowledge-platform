/**
 * Unit-level cases for the `app/knowledge/citation` contract
 * (`Citation`, `CitedGroundedAnswer`, `CitationBuilder`).
 *
 * Executed via:
 *
 *   pnpm validate:citation:contract
 *
 * Covered behaviors:
 * - KNOWLEDGE_MODULE_CITATION is exported with its expected value
 * - CitationBuilder is implementable from just the exported contract
 *   types (no concrete adapter exists yet) and its `build` method is
 *   callable, returning a `Citation[]` whose shape matches the
 *   citation module's own `Citation`
 * - CitationBuilder accommodates an empty-evidence GroundedAnswer
 *   (empty evidence -> empty Citation[])
 * - the top-level app/knowledge barrel re-exports
 *   Citation/CitedGroundedAnswer/CitationBuilder, verified via a
 *   compile-time type-assignability check
 */
export const CITATION_BUILDER_CONTRACT_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "citation_builder_port_contract_is_implementable_and_callable",
  "citation_builder_accepts_empty_evidence_answer",
  "top_level_barrel_exports_contract_types",
] as const;
