/**
 * Opaque identifier for one registered model (grouping of versions).
 */
export type ModelId = string & {
  readonly __brand: "ModelId";
};

/**
 * Normalize and brand a model id. Trims whitespace; rejects empty.
 */
export function asModelId(id: string): ModelId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("ModelId must be a non-empty string");
  }
  return id.trim() as ModelId;
}
