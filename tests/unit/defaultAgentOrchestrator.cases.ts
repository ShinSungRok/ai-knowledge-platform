/**
 * Unit-level cases for DefaultAgentOrchestrator.
 *
 * Executed via:
 *
 *   pnpm validate:agent:orchestrator
 *
 * Covered behaviors:
 * - planner/stepExecutor/reviewer port-only dependency (static source scan)
 * - approved review → status completed
 * - rejected + non-success tool call → status failed
 * - rejected + all-success tool calls (mismatch fake) → status rejected
 * - step throw → failure ToolCallResult (durationMs=0), stop remaining, still review
 */
export const DEFAULT_AGENT_ORCHESTRATOR_UNIT_CASES = [
  "depends_only_on_role_ports",
  "approved_review_maps_to_completed",
  "tool_failure_maps_to_failed",
  "success_but_rejected_maps_to_rejected",
  "thrown_step_stops_and_still_reviews",
] as const;
