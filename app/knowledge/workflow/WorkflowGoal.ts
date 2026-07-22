/**
 * Goal for one Multi-Agent workflow run (Project 3).
 *
 * Distinct from Project 2 single-agent {@link AgentGoal} — do not reuse
 * that shape for multi-agent orchestration.
 */
export interface WorkflowGoal {
  workspaceId: string;
  objective: string;
  metadata?: Readonly<Record<string, string>>;
}
