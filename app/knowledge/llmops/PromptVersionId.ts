/**
 * Opaque identifier for one version of a prompt template.
 */
export type PromptVersionId = string & {
  readonly __brand: "PromptVersionId";
};

/**
 * Normalize and brand a prompt version id. Trims whitespace; rejects empty.
 */
export function asPromptVersionId(id: string): PromptVersionId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("PromptVersionId must be a non-empty string");
  }
  return id.trim() as PromptVersionId;
}
