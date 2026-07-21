import type { MetricPoint } from "./MetricPoint";
import type { OtlpExporterConfig } from "./OtlpExporterConfig";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";
import {
  attributesToOtlpKeyValues,
  resolveOtlpSignalUrl,
} from "./otlpPayloadHelpers";

/**
 * Serializes {@link MetricPoint} batches to OTLP/HTTP JSON `/v1/metrics`.
 * Official OpenTelemetry SDK is not used.
 */
export class OtlpMetricsExporter {
  constructor(
    private readonly config: OtlpExporterConfig,
    private readonly transport: OtlpHttpTransport,
  ) {}

  async export(points: readonly MetricPoint[]): Promise<void> {
    const path = resolveOtlpSignalUrl(this.config.endpoint, "/v1/metrics");
    const body = JSON.stringify(this.buildPayload(points));
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(this.config.headers ? { ...this.config.headers } : {}),
    };
    const response = await this.transport.send({
      method: "POST",
      path,
      headers,
      body,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`OTLP metrics export failed: ${response.status}`);
    }
  }

  private buildPayload(points: readonly MetricPoint[]): unknown {
    const metrics = points.map((point) => ({
      name: point.name,
      gauge: {
        dataPoints: [
          {
            asDouble: point.value,
            attributes: attributesToOtlpKeyValues(point.attributes),
          },
        ],
      },
    }));

    return {
      resourceMetrics: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: this.config.serviceName },
              },
            ],
          },
          scopeMetrics: [
            {
              scope: { name: "ai-knowledge-platform" },
              metrics,
            },
          ],
        },
      ],
    };
  }
}
