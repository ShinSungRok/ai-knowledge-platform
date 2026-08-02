import type { WorkflowContentEvaluationMetrics } from "./WorkflowContentEvaluationMetrics";
import type { WorkflowRunEvaluatorInput } from "./WorkflowRunEvaluator";

/**
 * Async LLM-as-judge counterpart to {@link WorkflowRunEvaluator}: scores
 * whether a run's actual step output content satisfies its case objective,
 * rather than only checking structural artifacts.
 *
 * Reuses {@link WorkflowRunEvaluatorInput} — `dataset.cases[].objective`
 * plus `runsByCaseId` is enough context to judge each run. Implementations
 * MAY call a language model / network; the sibling {@link WorkflowRunEvaluator}
 * must stay pure and is unaffected by this port's existence.
 */
export interface WorkflowRunContentEvaluator {
  evaluate(
    input: WorkflowRunEvaluatorInput,
  ): Promise<WorkflowContentEvaluationMetrics>;
}
