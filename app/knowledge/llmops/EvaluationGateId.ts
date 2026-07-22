/**
 * Opaque identifier for one evaluation gate definition.
 */
export type EvaluationGateId = string & {
  readonly __brand: "EvaluationGateId";
};

/**
 * Normalize and brand an evaluation gate id. Trims whitespace; rejects empty.
 */
export function asEvaluationGateId(id: string): EvaluationGateId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("EvaluationGateId must be a non-empty string");
  }
  return id.trim() as EvaluationGateId;
}
