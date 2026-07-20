/**
 * Unit-level cases for FakeEmbeddingProvider.
 *
 * Executed via:
 *
 *   pnpm validate:embedding:provider
 *
 * Covered behaviors:
 * - implements the EmbeddingProvider port contract
 * - always returns a vector of exactly EMBEDDING_VECTOR_DIMENSION finite
 *   numbers, regardless of input length
 * - embedding the same text twice is deterministic (identical vector)
 * - splits input by Unicode code point (via Array.from), never breaking a
 *   surrogate pair / astral character in two, and stays deterministic for
 *   Unicode input
 * - rejects an empty or whitespace-only string
 * - embed() output is independent across calls — mutating one call's
 *   result does not affect a subsequent call
 */
export const FAKE_EMBEDDING_PROVIDER_UNIT_CASES = [
  "implements_EmbeddingProvider_port",
  "fixed_dimension_all_finite",
  "deterministic_output",
  "unicode_code_point_safety",
  "rejects_empty_or_whitespace_input",
  "output_independent_across_calls",
] as const;
