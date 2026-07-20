/**
 * Unit-level cases for `createInMemoryKnowledgeComposition`.
 *
 * Executed via:
 *
 *   pnpm validate:composition:in-memory
 */
export const IN_MEMORY_KNOWLEDGE_COMPOSITION_UNIT_CASES = [
  "module_constant",
  "cited_answer_path",
  "default_config_applied",
  "optional_limit_fallback",
  "application_does_not_import_composition_adapters",
] as const;
