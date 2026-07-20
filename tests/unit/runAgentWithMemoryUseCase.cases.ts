/**
 * Unit-level cases for RunAgentWithMemoryUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:run-agent-memory
 */
export const RUN_AGENT_WITH_MEMORY_USE_CASE_UNIT_CASES = [
  "depends_only_on_memory_store_and_agent_orchestrator_ports",
  "recall_before_write_and_fixed_agent_summary",
  "workspace_session_isolation",
  "invalid_input_short_circuits",
] as const;
