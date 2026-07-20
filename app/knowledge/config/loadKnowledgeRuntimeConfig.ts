import type { KnowledgeRuntimeConfig } from "./KnowledgeRuntimeConfig";

/**
 * Loads and validates a {@link KnowledgeRuntimeConfig} from a plain object.
 *
 * Does not read `process.env` or any file — callers supply a raw object
 * (e.g. from a later env adapter). Returns a defensive copy.
 */
export function loadKnowledgeRuntimeConfig(
  raw: unknown,
): KnowledgeRuntimeConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("KnowledgeRuntimeConfig raw must be a plain object");
  }

  const source = raw as Record<string, unknown>;
  const config: KnowledgeRuntimeConfig = {
    defaultRetrievalLimit: assertPositiveInteger(
      source["defaultRetrievalLimit"],
      "defaultRetrievalLimit",
    ),
    defaultMaxCharacters: assertPositiveInteger(
      source["defaultMaxCharacters"],
      "defaultMaxCharacters",
    ),
    defaultToolTimeoutMs: assertPositiveInteger(
      source["defaultToolTimeoutMs"],
      "defaultToolTimeoutMs",
    ),
    maxChunkLength: assertPositiveInteger(
      source["maxChunkLength"],
      "maxChunkLength",
    ),
  };

  return { ...config };
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `KnowledgeRuntimeConfig.${field} must be a positive integer`,
    );
  }
  return value;
}
