import type { EvaluationGateDefinition } from "./EvaluationGateDefinition";
import type { EvaluationGateId } from "./EvaluationGateId";
import type { EvaluationGateRule } from "./EvaluationGateRule";

/**
 * Input for registering one named gate definition. Caller supplies `id`.
 */
export interface EvaluationGateDefinitionRegisterInput {
  id: EvaluationGateId;
  workspaceId: string;
  name: string;
  rules: readonly EvaluationGateRule[];
}

/**
 * Port for workspace-scoped, persisted {@link EvaluationGateDefinition}s.
 *
 * Activates the definition type as a real, queryable registry instead of
 * pure documentation metadata — {@link EvaluationGateEvaluator} still only
 * ever consumes `rules`, never this store directly.
 */
export interface EvaluationGateDefinitionStore {
  register(
    input: EvaluationGateDefinitionRegisterInput,
  ): Promise<EvaluationGateDefinition>;
  getById(
    workspaceId: string,
    id: EvaluationGateId,
  ): Promise<EvaluationGateDefinition | null>;
  listByWorkspace(
    workspaceId: string,
  ): Promise<readonly EvaluationGateDefinition[]>;
}
