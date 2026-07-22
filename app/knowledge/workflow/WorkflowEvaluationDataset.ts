import type { WorkflowEvaluationCase } from "./WorkflowEvaluationCase";

/**
 * Named collection of {@link WorkflowEvaluationCase}s for Multi-Agent
 * workflow evaluation runs.
 */
export interface WorkflowEvaluationDataset {
  id: string;
  cases: readonly WorkflowEvaluationCase[];
}
