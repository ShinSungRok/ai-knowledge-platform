import type { OtlpExporterConfig } from "./OtlpExporterConfig";

/**
 * Loads {@link OtlpExporterConfig} from environment-like records.
 * Returns `null` when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset/empty.
 */
export function loadOtlpExporterConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): OtlpExporterConfig | null {
  const rawEndpoint = env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  if (rawEndpoint === undefined || rawEndpoint.trim().length === 0) {
    return null;
  }

  const endpoint = normalizeEndpoint(rawEndpoint.trim());
  const serviceNameRaw = env["OTEL_SERVICE_NAME"];
  const serviceName =
    serviceNameRaw !== undefined && serviceNameRaw.trim().length > 0
      ? serviceNameRaw.trim()
      : "ai-knowledge-platform";

  const headers = parseHeaders(env["OTEL_EXPORTER_OTLP_HEADERS"]);

  const config: OtlpExporterConfig = {
    endpoint,
    serviceName,
  };
  if (Object.keys(headers).length > 0) {
    config.headers = { ...headers };
  }
  return config;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function parseHeaders(
  raw: string | undefined,
): Record<string, string> {
  if (raw === undefined || raw.trim().length === 0) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key.length === 0) {
      continue;
    }
    result[key] = value;
  }
  return result;
}
