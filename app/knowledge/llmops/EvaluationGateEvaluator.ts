import type { EvaluationGateResult } from "./EvaluationGateResult";
import type { EvaluationGateRule } from "./EvaluationGateRule";

/**
 * Input for evaluating numeric metrics against gate rules.
 *
 * Soft link (document only): `metrics` may come from
 * {@link ExperimentRunRecord.metrics} or flattened Project 2 `evaluation`
 * aggregate metrics — do not import evaluation types into llmops.
 */
export interface EvaluationGateEvaluatorInput {
  metrics: Readonly<Record<string, number>>;
  rules: readonly EvaluationGateRule[];
}

/**
 * Pure evaluator port for numeric-metric evaluation gates.
 *
 * No persistence store this Sprint. No LLM-as-judge. Serving /
 * Observability remain deferred.
 */
export interface EvaluationGateEvaluator {
  evaluate(input: EvaluationGateEvaluatorInput): EvaluationGateResult;
}
