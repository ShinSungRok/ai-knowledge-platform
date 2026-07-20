import type { EvaluationCase } from "./EvaluationCase";

/**
 * A named collection of {@link EvaluationCase}s for quality/regression runs.
 */
export interface EvaluationDataset {
  id: string;
  cases: readonly EvaluationCase[];
}
