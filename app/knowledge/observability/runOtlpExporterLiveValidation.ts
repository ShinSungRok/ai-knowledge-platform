/**
 * Optional live OTLP/HTTP smoke. Skips (exit 0) when
 * `OTEL_EXPORTER_OTLP_ENDPOINT` is unset. Not included in top-level validate.
 */
import { ExportingLogger } from "./ExportingLogger";
import { ExportingMetrics } from "./ExportingMetrics";
import { FetchOtlpHttpTransport } from "./FetchOtlpHttpTransport";
import { InMemoryLogger } from "./InMemoryLogger";
import { InMemoryMetrics } from "./InMemoryMetrics";
import { loadOtlpExporterConfig } from "./loadOtlpExporterConfig";
import { OtlpLogsExporter } from "./OtlpLogsExporter";
import { OtlpMetricsExporter } from "./OtlpMetricsExporter";

async function main(): Promise<void> {
  const config = loadOtlpExporterConfig(process.env);
  if (config === null) {
    console.log(
      "[observability] OTEL_EXPORTER_OTLP_ENDPOINT unset — skipping live OTLP smoke.",
    );
    return;
  }

  console.log("[observability] Running live OTLP export smoke...");
  const transport = new FetchOtlpHttpTransport();
  const logger = new ExportingLogger(
    new InMemoryLogger(),
    new OtlpLogsExporter(config, transport),
  );
  const metrics = new ExportingMetrics(
    new InMemoryMetrics(),
    new OtlpMetricsExporter(config, transport),
  );
  logger.log({
    level: "info",
    message: "otlp.live.smoke",
    attributes: { source: "validate:observability:otlp-live" },
  });
  metrics.increment("otlp.live.smoke", { source: "validation" });
  await logger.flush();
  await metrics.flush();
  console.log("OTLP live validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
