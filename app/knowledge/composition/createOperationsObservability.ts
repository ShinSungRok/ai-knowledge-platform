import { ExportingLogger } from "../observability/ExportingLogger";
import { ExportingMetrics } from "../observability/ExportingMetrics";
import { FetchOtlpHttpTransport } from "../observability/FetchOtlpHttpTransport";
import { InMemoryLogger } from "../observability/InMemoryLogger";
import { InMemoryMetrics } from "../observability/InMemoryMetrics";
import type { Logger } from "../observability/Logger";
import { loadOtlpExporterConfig } from "../observability/loadOtlpExporterConfig";
import type { Metrics } from "../observability/Metrics";
import { OtlpLogsExporter } from "../observability/OtlpLogsExporter";
import { OtlpMetricsExporter } from "../observability/OtlpMetricsExporter";

export type OperationsObservability = {
  /** Always the in-memory sink (validation-friendly `getEvents`). */
  logger: InMemoryLogger;
  /** Always the in-memory sink (validation-friendly `getPoints`). */
  metrics: InMemoryMetrics;
  /** Logger injected into ObservingHttpRouter (may wrap with OTLP export). */
  routerLogger: Logger;
  /** Metrics injected into ObservingHttpRouter (may wrap with OTLP export). */
  routerMetrics: Metrics;
  /**
   * When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, flushes buffered logs and
   * metric snapshots to the collector. Undefined when OTLP is inactive.
   */
  flushObservability?: () => Promise<void>;
};

/**
 * Builds operations observability. Default is InMemory only.
 * When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, wraps InMemory sinks with
 * ExportingLogger/ExportingMetrics for the HTTP router.
 */
export function createOperationsObservability(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): OperationsObservability {
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const otlp = loadOtlpExporterConfig(env);
  if (otlp === null) {
    return {
      logger,
      metrics,
      routerLogger: logger,
      routerMetrics: metrics,
    };
  }

  const transport = new FetchOtlpHttpTransport();
  const exportingLogger = new ExportingLogger(
    logger,
    new OtlpLogsExporter(otlp, transport),
  );
  const exportingMetrics = new ExportingMetrics(
    metrics,
    new OtlpMetricsExporter(otlp, transport),
  );
  return {
    logger,
    metrics,
    routerLogger: exportingLogger,
    routerMetrics: exportingMetrics,
    flushObservability: async () => {
      await exportingLogger.flush();
      await exportingMetrics.flush();
    },
  };
}
