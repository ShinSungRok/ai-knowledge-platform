/**
 * Unit-level cases for `KnowledgeRuntimeConfig` / loader.
 *
 * Executed via:
 *
 *   pnpm validate:config:runtime
 */
export const KNOWLEDGE_RUNTIME_CONFIG_UNIT_CASES = [
  "module_constant_is_exported_correctly",
  "default_constant_has_expected_values",
  "valid_load",
  "defensive_copy",
  "rejects_invalid_input",
  "top_level_barrel_exports",
] as const;
