/**
 * Unit-level cases for `InMemorySqlGateway`.
 *
 * Executed via:
 *
 *   pnpm validate:infra:in-memory-sql
 */
export const IN_MEMORY_SQL_GATEWAY_UNIT_CASES = [
  "module_constant",
  "supported_sql_round_trip",
  "unsupported_sql_throws",
  "param_mismatch_throws",
] as const;
