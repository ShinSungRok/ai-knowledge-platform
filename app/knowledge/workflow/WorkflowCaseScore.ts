import type { WorkflowRunStatus } from "./WorkflowRunStatus";

/**
 * Per-case score from {@link WorkflowRunEvaluator}.
 */
export interface WorkflowCaseScore {
  caseId: string;
  passed: boolean;
  actualStatus: WorkflowRunStatus;
  failureReasons?: readonly string[];
}
