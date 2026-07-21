import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import { ObservingHttpRouter } from "../http/ObservingHttpRouter";
import { ExportingLogger } from "./ExportingLogger";
import { ExportingMetrics } from "./ExportingMetrics";
import { InMemoryLogger } from "./InMemoryLogger";
import { InMemoryMetrics } from "./InMemoryMetrics";
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
  serviceName: "exporting-demo",
} as const;

async function assertExportingLoggerFlush(): Promise<void> {
  console.log(
    "[observability] ExportingLogger buffers then flushes to /v1/logs...",
  );
  const transport = new FakeOtlpHttpTransport();
  const inner = new InMemoryLogger();
  const logger = new ExportingLogger(
    inner,
    new OtlpLogsExporter(CONFIG, transport),
  );
  logger.log({ level: "info", message: "buffered", attributes: { k: "v" } });
  assertEqual(logger.getBufferedCount(), 1, "buffered");
  assertEqual(inner.getEvents().length, 1, "inner received");
  await logger.flush();
  assertEqual(logger.getBufferedCount(), 0, "cleared after flush");
  assertEqual(transport.requests.length, 1, "exported");
  assertEqual(
    transport.requests[0]!.path,
    "http://collector:4318/v1/logs",
    "logs path",
  );
  const payload = JSON.parse(transport.requests[0]!.body) as {
    resourceLogs: Array<{
      resource: { attributes: Array<{ value: { stringValue: string } }> };
    }>;
  };
  assertEqual(
    payload.resourceLogs[0]!.resource.attributes[0]!.value.stringValue,
    "exporting-demo",
    "service.name",
  );
}

async function assertExportingLoggerKeepsBufferOnFailure(): Promise<void> {
  console.log(
    "[observability] ExportingLogger keeps buffer when export fails...",
  );
  const transport = new FakeOtlpHttpTransport();
  transport.nextStatus = 500;
  const logger = new ExportingLogger(
    new InMemoryLogger(),
    new OtlpLogsExporter(CONFIG, transport),
  );
  logger.log({ level: "error", message: "fail-me", attributes: {} });
  await assertThrowsAsync(() => logger.flush(), "OTLP logs export failed: 500");
  assertEqual(logger.getBufferedCount(), 1, "buffer retained");
}

async function assertExportingMetricsFlush(): Promise<void> {
  console.log(
    "[observability] ExportingMetrics flush posts /v1/metrics snapshot...",
  );
  const transport = new FakeOtlpHttpTransport();
  const inner = new InMemoryMetrics();
  const metrics = new ExportingMetrics(
    inner,
    new OtlpMetricsExporter(CONFIG, transport),
  );
  metrics.increment("http.requests", { method: "GET" });
  metrics.increment("http.requests", { method: "GET" });
  await metrics.flush();
  assertEqual(transport.requests.length, 1, "exported");
  assertEqual(
    transport.requests[0]!.path,
    "http://collector:4318/v1/metrics",
    "metrics path",
  );
  assertEqual(inner.getPoints()[0]!.value, 2, "inner retained");
}

async function assertObservingRouterSmoke(): Promise<void> {
  console.log(
    "[observability] ObservingHttpRouter + ExportingLogger/Metrics flush...",
  );
  const transport = new FakeOtlpHttpTransport();
  const logger = new ExportingLogger(
    new InMemoryLogger(),
    new OtlpLogsExporter(CONFIG, transport),
  );
  const metrics = new ExportingMetrics(
    new InMemoryMetrics(),
    new OtlpMetricsExporter(CONFIG, transport),
  );
  const router = new ObservingHttpRouter(
    new DefaultHttpRouter([
      {
        method: "GET",
        path: "/health",
        handler: async () => ({
          status: 200,
          headers: { "content-type": "application/json" },
          body: { status: "ok" },
        }),
      },
    ]),
    logger,
    metrics,
  );
  await router.handle({ method: "GET", path: "/health", headers: {} });
  await logger.flush();
  await metrics.flush();
  assertTruthy(
    transport.requests.some((r) => r.path.endsWith("/v1/logs")),
    "logs exported",
  );
  assertTruthy(
    transport.requests.some((r) => r.path.endsWith("/v1/metrics")),
    "metrics exported",
  );
}

async function main(): Promise<void> {
  await assertExportingLoggerFlush();
  await assertExportingLoggerKeepsBufferOnFailure();
  await assertExportingMetricsFlush();
  await assertObservingRouterSmoke();
  console.log("Exporting observability validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
