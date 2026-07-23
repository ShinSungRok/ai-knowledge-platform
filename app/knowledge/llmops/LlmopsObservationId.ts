/**
 * Opaque identifier for one LLMOps quality/cost/latency observation.
 */
export type LlmopsObservationId = string & {
  readonly __brand: "LlmopsObservationId";
};

/**
 * Normalize and brand an observation id. Trims whitespace; rejects empty.
 */
export function asLlmopsObservationId(id: string): LlmopsObservationId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("LlmopsObservationId must be a non-empty string");
  }
  return id.trim() as LlmopsObservationId;
}
