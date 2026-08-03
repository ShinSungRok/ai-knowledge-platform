import type { LlmHttpProviderConfig } from "./LlmHttpProviderConfig";

/**
 * Loads and validates a {@link LlmHttpProviderConfig} from a plain object.
 * Does not read `process.env`. Returns a defensive copy.
 */
export function loadLlmHttpProviderConfig(raw: unknown): LlmHttpProviderConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("LlmHttpProviderConfig raw must be a plain object");
  }

  const source = raw as Record<string, unknown>;
  const baseUrl = assertNonEmptyString(source["baseUrl"], "baseUrl");
  const apiKey = assertNonEmptyString(source["apiKey"], "apiKey");
  const model = assertNonEmptyString(source["model"], "model");

  const config: LlmHttpProviderConfig = {
    baseUrl,
    apiKey,
    model,
  };

  if (source["timeoutMs"] !== undefined) {
    config.timeoutMs = assertPositiveInteger(source["timeoutMs"], "timeoutMs");
  }
  if (source["temperature"] !== undefined) {
    config.temperature = assertTemperature(source["temperature"]);
  }

  return { ...config };
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `LlmHttpProviderConfig.${field} must be a non-empty string`,
    );
  }
  return value;
}

function assertPositiveInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `LlmHttpProviderConfig.${field} must be a positive integer`,
    );
  }
  return value;
}

function assertTemperature(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 2
  ) {
    throw new Error(
      "LlmHttpProviderConfig.temperature must be a finite number in [0, 2]",
    );
  }
  return value;
}
