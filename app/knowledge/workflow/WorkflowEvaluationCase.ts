import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import type { WorkflowMemoryEntryKind } from "./WorkflowMemoryEntryKind";
import type { WorkflowRunStatus } from "./WorkflowRunStatus";

/**
 * One Multi-Agent workflow evaluation case.
 *
 * Used by both {@link WorkflowRunEvaluator} (pure structural scoring of
 * orchestrator/memory artifacts) and {@link WorkflowRunContentEvaluator}
 * (async LLM-as-judge content scoring against `objective`).
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
