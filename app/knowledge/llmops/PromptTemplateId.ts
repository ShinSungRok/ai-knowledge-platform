/**
 * Opaque identifier for one prompt template (grouping of versions).
 */
export type PromptTemplateId = string & {
  readonly __brand: "PromptTemplateId";
};

/**
 * Normalize and brand a prompt template id. Trims whitespace; rejects empty.
 */
export function asPromptTemplateId(id: string): PromptTemplateId {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("PromptTemplateId must be a non-empty string");
  }
  return id.trim() as PromptTemplateId;
}
