/**
 * Module: `app/knowledge/observability`
 *
 * Structured logging and metrics foundations for Operations.
 *
 * `Logger` / `LogEvent` / `LogLevel` and `Metrics` / `MetricPoint` are
 * dependency-free ports. `InMemoryLogger` and `InMemoryMetrics` are the
 * in-process adapters used by validation and the operations server
 * factory. OpenTelemetry/Prometheus exporters remain out of scope.
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
