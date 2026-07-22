import type { EvaluationGateId } from "./EvaluationGateId";
import type { EvaluationGateRule } from "./EvaluationGateRule";

/**
 * Named gate definition (metadata for documentation; evaluator uses rules only).
 * No persistence store this Sprint.
 */
export interface EvaluationGateDefinition {
  id: EvaluationGateId;
  workspaceId: string;
  name: string;
  rules: readonly EvaluationGateRule[];
}
