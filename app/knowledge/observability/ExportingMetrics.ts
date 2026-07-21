import type { MetricPoint } from "./MetricPoint";
import type { Metrics } from "./Metrics";
import type { OtlpMetricsExporter } from "./OtlpMetricsExporter";

/**
 * {@link Metrics} that delegates increment/getPoints to an inner sink and
 * exports a snapshot via OTLP on `flush` (inner accumulation is retained).
 */
export class ExportingMetrics implements Metrics {
  constructor(
    private readonly inner: Metrics,
    private readonly exporter: OtlpMetricsExporter,
  ) {}

  increment(
    name: string,
    attributes?: Readonly<Record<string, string>>,
  ): void {
    this.inner.increment(name, attributes);
  }

  getPoints(): readonly MetricPoint[] {
    return this.inner.getPoints();
  }

  async flush(): Promise<void> {
    const points = this.inner.getPoints();
    if (points.length === 0) {
      return;
    }
    await this.exporter.export(points);
  }
}
