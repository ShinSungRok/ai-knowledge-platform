/**
 * Opaque identifier for one version of a registered model.
 */
export type ModelVersionId = string & {
  readonly __brand: "ModelVersionId";
};

/**
 * Normalize and brand a model version id. Trims whitespace; rejects empty.
 */
export function asModelVersionId(id: string): ModelVersionId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("ModelVersionId must be a non-empty string");
  }
  return id.trim() as ModelVersionId;
}
