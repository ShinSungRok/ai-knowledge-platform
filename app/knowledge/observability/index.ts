/**
 * Module: `app/knowledge/observability`
 *
 * Structured logging and metrics foundations for Operations, plus an
 * OTLP/HTTP export boundary including OTLP/HTTP spans. Official OpenTelemetry
 * SDK / W3C propagator full suite remain deferred.
 *
 * `Logger` / `LogEvent` / `LogLevel` and `Metrics` / `MetricPoint` are
 * dependency-free ports. `Tracer` / `Span` define the tracing port.
 * `InMemoryLogger` and `InMemoryMetrics` are the default in-process adapters.
 * `OtlpHttpTransport` / `OtlpExporterConfig` define optional collector export
 * without `@opentelemetry/*`.
 */
export const KNOWLEDGE_MODULE_OBSERVABILITY =
  "app/knowledge/observability" as const;

export type { LogLevel } from "./LogLevel";
export type { LogEvent } from "./LogEvent";
export type { Logger } from "./Logger";
export { InMemoryLogger } from "./InMemoryLogger";
export type { MetricPoint } from "./MetricPoint";
export type { Metrics } from "./Metrics";
export { InMemoryMetrics } from "./InMemoryMetrics";
export type { TraceId } from "./TraceId";
export type { SpanId } from "./SpanId";
export type { SpanStatus } from "./SpanStatus";
export type { SpanAttributes } from "./SpanAttributes";
export type { Span } from "./Span";
export type { Tracer } from "./Tracer";
export { toPrometheusText } from "./prometheusText";
export type { OtlpHttpRequest } from "./OtlpHttpRequest";
export type { OtlpHttpResponse } from "./OtlpHttpResponse";
export type { OtlpHttpTransport } from "./OtlpHttpTransport";
export type { OtlpExporterConfig } from "./OtlpExporterConfig";
export { loadOtlpExporterConfig } from "./loadOtlpExporterConfig";
export { OtlpLogsExporter } from "./OtlpLogsExporter";
export { OtlpMetricsExporter } from "./OtlpMetricsExporter";
export { ExportingLogger } from "./ExportingLogger";
export { ExportingMetrics } from "./ExportingMetrics";
export { FetchOtlpHttpTransport } from "./FetchOtlpHttpTransport";
