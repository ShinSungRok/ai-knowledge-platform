import type { WorkflowEvaluationDataset } from "./WorkflowEvaluationDataset";
import type { WorkflowEvaluationMetrics } from "./WorkflowEvaluationMetrics";
import type { WorkflowMemoryEntry } from "./WorkflowMemoryEntry";
import type { WorkflowRunResult } from "./WorkflowRunResult";

/**
 * Input for pure Multi-Agent workflow run scoring.
 */
export interface WorkflowRunEvaluatorInput {
  dataset: WorkflowEvaluationDataset;
  runsByCaseId: ReadonlyMap<string, WorkflowRunResult>;
  memoryByCaseId?: ReadonlyMap<string, readonly WorkflowMemoryEntry[]>;
}

/**
 * Pure scoring port over workflow run (+ optional memory) artifacts.
 *
 * Implementations must not call orchestrators, LLMs, or network I/O.
 * Distinct from Project 2 RAG evaluators under `app/knowledge/evaluation`.
 */
export interface WorkflowRunEvaluator {
  evaluate(input: WorkflowRunEvaluatorInput): WorkflowEvaluationMetrics;
}
