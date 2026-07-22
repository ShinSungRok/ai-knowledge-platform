import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";

/**
 * One Multi-Agent workflow evaluation case.
 *
 * Scores orchestrator/memory artifacts only — no LLM-as-judge.
 * Distinct from Project 2 RAG {@link EvaluationCase}.
 */
export interface WorkflowEvaluationCase {
  id: string;
  workspaceId: string;
  objective: string;
  expectStatus: WorkflowRunStatus;
  expectMinCompletedSteps?: number;
  expectRequiredRoles?: readonly WorkflowAgentRole[];
  expectHandoff?: boolean;
  expectMemoryKinds?: readonly WorkflowMemoryEntryKind[];
}
