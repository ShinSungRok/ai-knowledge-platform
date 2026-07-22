import type { EndedSpan } from "./EndedSpan";
import type { OtlpExporterConfig } from "./OtlpExporterConfig";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";
import type { SpanStatus } from "./SpanStatus";
import {
  attributesToOtlpKeyValues,
  resolveOtlpSignalUrl,
} from "./otlpPayloadHelpers";

const STATUS_CODE: Record<SpanStatus, number> = {
  unset: 0,
  ok: 1,
  error: 2,
};

/**
 * Serializes {@link EndedSpan} batches to OTLP/HTTP JSON `/v1/traces`.
 * Official OpenTelemetry SDK is not used.
 */
export class OtlpTracesExporter {
  constructor(
    private readonly config: OtlpExporterConfig,
    private readonly transport: OtlpHttpTransport,
  ) {}

  async export(spans: readonly EndedSpan[]): Promise<void> {
    const path = resolveOtlpSignalUrl(this.config.endpoint, "/v1/traces");
    const body = JSON.stringify(this.buildPayload(spans));
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
      throw new Error(`OTLP traces export failed: ${response.status}`);
    }
  }

  private buildPayload(spans: readonly EndedSpan[]): unknown {
    const otlpSpans = spans.map((span) => {
      const record: Record<string, unknown> = {
        traceId: span.traceId,
        spanId: span.spanId,
        name: span.name,
        startTimeUnixNano: span.startTimeUnixNano,
        endTimeUnixNano: span.endTimeUnixNano,
        attributes: attributesToOtlpKeyValues(span.attributes),
        status: { code: STATUS_CODE[span.status] },
      };
      if (span.parentSpanId !== undefined) {
        record.parentSpanId = span.parentSpanId;
      }
      return record;
    });

    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: this.config.serviceName },
              },
            ],
          },
          scopeSpans: [
            {
              scope: { name: "ai-knowledge-platform" },
              spans: otlpSpans,
            },
          ],
        },
      ],
    };
  }
}
