import type { OtlpHttpRequest } from "./OtlpHttpRequest";
import type { OtlpHttpResponse } from "./OtlpHttpResponse";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";
import { OtlpLogsExporter } from "./OtlpLogsExporter";
import { OtlpMetricsExporter } from "./OtlpMetricsExporter";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageIncludes: string,
): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch (error: unknown) {
    threw = true;
    const message = error instanceof Error ? error.message : String(error);
    assertTruthy(
      message.includes(messageIncludes),
      `expected "${messageIncludes}" in "${message}"`,
    );
  }
  assertTruthy(threw, `expected throw including ${messageIncludes}`);
}

class FakeOtlpHttpTransport implements OtlpHttpTransport {
  readonly requests: OtlpHttpRequest[] = [];
  nextStatus = 200;

  async send(request: OtlpHttpRequest): Promise<OtlpHttpResponse> {
    this.requests.push({
      method: request.method,
      path: request.path,
      headers: { ...request.headers },
      body: request.body,
    });
    return { status: this.nextStatus, body: "" };
  }
}

const CONFIG = {
  endpoint: "http://collector:4318",
  serviceName: "demo-service",
  headers: { "x-api-key": "secret" },
} as const;

async function assertLogsExport(): Promise<void> {
  console.log("[observability] OtlpLogsExporter posts /v1/logs with service.name...");
  const transport = new FakeOtlpHttpTransport();
  const exporter = new OtlpLogsExporter(CONFIG, transport);
  await exporter.export([
    {
      level: "info",
      message: "hello",
      attributes: { b: true, a: "1", n: 2 },
    },
  ]);
  assertEqual(transport.requests.length, 1, "one request");
  const request = transport.requests[0]!;
  assertEqual(request.path, "http://collector:4318/v1/logs", "logs path");
  assertEqual(request.headers["x-api-key"], "secret", "header");
  const payload = JSON.parse(request.body) as {
    resourceLogs: Array<{
      resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
      scopeLogs: Array<{
        logRecords: Array<{
          body: { stringValue: string };
          severityText: string;
          attributes: Array<{ key: string }>;
        }>;
      }>;
    }>;
  };
  assertEqual(
    payload.resourceLogs[0]!.resource.attributes[0]!.value.stringValue,
    "demo-service",
    "service.name",
  );
  const record = payload.resourceLogs[0]!.scopeLogs[0]!.logRecords[0]!;
  assertEqual(record.body.stringValue, "hello", "message");
  assertEqual(record.severityText, "INFO", "severity");
  assertEqual(
    record.attributes.map((a) => a.key).join(","),
    "a,b,n",
    "sorted attributes",
  );
}

async function assertMetricsExport(): Promise<void> {
  console.log(
    "[observability] OtlpMetricsExporter posts /v1/metrics with gauge points...",
  );
  const transport = new FakeOtlpHttpTransport();
  const exporter = new OtlpMetricsExporter(CONFIG, transport);
  await exporter.export([
    { name: "http.requests", value: 3, attributes: { z: "2", a: "1" } },
  ]);
  assertEqual(transport.requests.length, 1, "one request");
  const request = transport.requests[0]!;
  assertEqual(request.path, "http://collector:4318/v1/metrics", "metrics path");
  const payload = JSON.parse(request.body) as {
    resourceMetrics: Array<{
      resource: { attributes: Array<{ value: { stringValue: string } }> };
      scopeMetrics: Array<{
        metrics: Array<{
          name: string;
          gauge: { dataPoints: Array<{ asDouble: number; attributes: Array<{ key: string }> }> };
        }>;
      }>;
    }>;
  };
  assertEqual(
    payload.resourceMetrics[0]!.resource.attributes[0]!.value.stringValue,
    "demo-service",
    "service.name",
  );
  const metric = payload.resourceMetrics[0]!.scopeMetrics[0]!.metrics[0]!;
  assertEqual(metric.name, "http.requests", "metric name");
  assertEqual(metric.gauge.dataPoints[0]!.asDouble, 3, "value");
  assertEqual(
    metric.gauge.dataPoints[0]!.attributes.map((a) => a.key).join(","),
    "a,z",
    "sorted attrs",
  );
}

async function assertNoDuplicateSignalPath(): Promise<void> {
  console.log(
    "[observability] exporters do not duplicate /v1/logs when already on endpoint...",
  );
  const transport = new FakeOtlpHttpTransport();
  const exporter = new OtlpLogsExporter(
    { endpoint: "http://collector:4318/v1/logs", serviceName: "s" },
    transport,
  );
  await exporter.export([
    { level: "warn", message: "w", attributes: {} },
  ]);
  assertEqual(
    transport.requests[0]!.path,
    "http://collector:4318/v1/logs",
    "no duplicate",
  );
}

async function assertNon2xxThrows(): Promise<void> {
  console.log("[observability] exporters throw on non-2xx transport status...");
  const transport = new FakeOtlpHttpTransport();
  transport.nextStatus = 503;
  await assertThrowsAsync(
    () =>
      new OtlpLogsExporter(CONFIG, transport).export([
        { level: "error", message: "e", attributes: {} },
      ]),
    "OTLP logs export failed: 503",
  );
  await assertThrowsAsync(
    () =>
      new OtlpMetricsExporter(CONFIG, transport).export([
        { name: "m", value: 1, attributes: {} },
      ]),
    "OTLP metrics export failed: 503",
  );
}

async function main(): Promise<void> {
  await assertLogsExport();
  await assertMetricsExport();
  await assertNoDuplicateSignalPath();
  await assertNon2xxThrows();
  console.log("Otlp exporters validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
