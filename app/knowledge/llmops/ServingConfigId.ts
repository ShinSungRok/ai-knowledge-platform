/**
 * Opaque identifier for one serving configuration record.
 */
export type ServingConfigId = string & {
  readonly __brand: "ServingConfigId";
};

/**
 * Normalize and brand a serving config id. Trims whitespace; rejects empty.
 */
export function asServingConfigId(id: string): ServingConfigId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("ServingConfigId must be a non-empty string");
  }
  return id.trim() as ServingConfigId;
}
