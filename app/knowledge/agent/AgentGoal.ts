/**
 * Goal for a single knowledge-aware Agent run: workspace-scoped query
 * parameters plus the per-tool timeout budget the orchestrator will
 * pass to step execution.
 */
export interface AgentGoal {
  workspaceId: string;
  query: string;
  retrievalLimit: number;
  maxCharacters: number;
  toolTimeoutMs: number;
}
