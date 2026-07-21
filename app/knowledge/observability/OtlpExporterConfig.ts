/**
 * Configuration for OTLP/HTTP log and metrics exporters.
 *
 * `endpoint` is the collector base URL (trailing slash normalized by loader).
 * Official OpenTelemetry SDK config types are intentionally unused.
 */
export type OtlpExporterConfig = {
  endpoint: string;
  headers?: Readonly<Record<string, string>>;
  serviceName: string;
};
