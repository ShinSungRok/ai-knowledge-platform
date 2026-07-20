/**
 * Unit-level cases for RunAgentUseCase.
 *
 * Executed via:
 *
 *   pnpm validate:application:run-agent
 *
 * Covered behaviors:
 * - AgentOrchestrator port-only dependency (static source scan)
 * - valid input → orchestrator.run delegation + unchanged AgentRunResult
 * - invalid input rejection without calling orchestrator
 */
export const RUN_AGENT_USE_CASE_UNIT_CASES = [
  "depends_only_on_agent_orchestrator_port",
  "execute_delegates_to_orchestrator",
  "invalid_input_rejected_without_orchestrator_call",
] as const;
