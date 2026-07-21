import type { LogEvent } from "./LogEvent";
import type { LogLevel } from "./LogLevel";
import type { OtlpExporterConfig } from "./OtlpExporterConfig";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";
import {
  attributesToOtlpKeyValues,
  resolveOtlpSignalUrl,
} from "./otlpPayloadHelpers";

const SEVERITY: Record<LogLevel, { text: string; number: number }> = {
  debug: { text: "DEBUG", number: 5 },
  info: { text: "INFO", number: 9 },
  warn: { text: "WARN", number: 13 },
  error: { text: "ERROR", number: 17 },
};

/**
 * Serializes {@link LogEvent} batches to OTLP/HTTP JSON `/v1/logs`.
 * Official OpenTelemetry SDK is not used.
 */
export class OtlpLogsExporter {
  constructor(
    private readonly config: OtlpExporterConfig,
    private readonly transport: OtlpHttpTransport,
  ) {}

  async export(events: readonly LogEvent[]): Promise<void> {
    const url = resolveOtlpSignalUrl(this.config.endpoint, "/v1/logs");
    const path = url; // full URL as path for transport that treats path as URL
    const body = JSON.stringify(this.buildPayload(events));
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
      throw new Error(`OTLP logs export failed: ${response.status}`);
    }
  }

  private buildPayload(events: readonly LogEvent[]): unknown {
    const logRecords = events.map((event) => {
      const severity = SEVERITY[event.level];
      return {
        severityText: severity.text,
        severityNumber: severity.number,
        body: { stringValue: event.message },
        attributes: attributesToOtlpKeyValues(event.attributes),
      };
    });

    return {
      resourceLogs: [
        {
          resource: {
            attributes: [
              {
                key: "service.name",
                value: { stringValue: this.config.serviceName },
              },
            ],
          },
          scopeLogs: [
            {
              scope: { name: "ai-knowledge-platform" },
              logRecords,
            },
          ],
        },
      ],
    };
  }
}
