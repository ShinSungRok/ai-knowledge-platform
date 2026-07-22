import type { WorkflowRunId } from "./WorkflowRunId";

/**
 * Goal for one Multi-Agent workflow run (Project 3).
 *
 * Distinct from Project 2 single-agent {@link AgentGoal} — do not reuse
 * that shape for multi-agent orchestration.
 *
 * Optional `workflowRunId` scopes Shared Workflow Memory for the run.
 * When absent, {@link DefaultWorkflowOrchestrator} assigns one via its
 * `runIdFactory`.
 */
export interface WorkflowGoal {
  workspaceId: string;
  objective: string;
  metadata?: Readonly<Record<string, string>>;
  workflowRunId?: WorkflowRunId;
}
