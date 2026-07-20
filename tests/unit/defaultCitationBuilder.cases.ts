/**
 * Unit-level cases for `DefaultCitationBuilder`
 * (`app/knowledge/citation/DefaultCitationBuilder.ts`).
 *
 * Executed via:
 *
 *   pnpm validate:citation:builder
 *
 * Covered behaviors:
 * - port contract: build is defined and callable
 * - one citation per evidence block with deterministic id format
 *   `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`
 *   and copied provenance/excerpt (no truncation)
 * - empty evidence returns empty Citation[] (never fabricates)
 * - preserves evidence order (never re-sorts)
 * - never mutates the input answer/evidence and returns fresh citation
 *   objects
 * - rejects an invalid GroundedAnswer or GroundingContextBlock
 * - DefaultCitationBuilder imports only ports/types, never a concrete
 *   adapter, provider, or repository
 */
export const DEFAULT_CITATION_BUILDER_UNIT_CASES = [
  "port_contract_build_is_defined",
  "one_citation_per_evidence_with_deterministic_id",
  "empty_evidence_returns_empty_citations",
  "preserves_evidence_order",
  "returns_defensive_copies_and_does_not_mutate_input",
  "rejects_invalid_answer",
  "imports_only_ports_never_concrete_adapter",
] as const;
