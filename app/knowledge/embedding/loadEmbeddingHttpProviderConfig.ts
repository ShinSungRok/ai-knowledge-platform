import type { EmbeddingHttpProviderConfig } from "./EmbeddingHttpProviderConfig";

/**
 * Loads and validates an {@link EmbeddingHttpProviderConfig} from a plain
 * object. Does not read `process.env`. Returns a defensive copy.
 */
export function loadEmbeddingHttpProviderConfig(
  raw: unknown,
): EmbeddingHttpProviderConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("EmbeddingHttpProviderConfig raw must be a plain object");
  }

  const source = raw as Record<string, unknown>;
  const baseUrl = assertNonEmptyString(source["baseUrl"], "baseUrl");
  const apiKey = assertNonEmptyString(source["apiKey"], "apiKey");
  const model = assertNonEmptyString(source["model"], "model");

  const config: EmbeddingHttpProviderConfig = {
    baseUrl,
    apiKey,
    model,
  };

  if (source["dimensions"] !== undefined) {
    config.dimensions = assertPositiveInteger(source["dimensions"], "dimensions");
  }

  return { ...config };
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `EmbeddingHttpProviderConfig.${field} must be a non-empty string`,
    );
  }
  return value;
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `EmbeddingHttpProviderConfig.${field} must be a positive integer`,
    );
  }
  return value;
}
