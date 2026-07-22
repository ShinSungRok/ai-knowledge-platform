import { ExportingTracer } from "./ExportingTracer";
import { InMemoryTracer } from "./InMemoryTracer";
import type { OtlpHttpRequest } from "./OtlpHttpRequest";
import type { OtlpHttpResponse } from "./OtlpHttpResponse";
import type { OtlpHttpTransport } from "./OtlpHttpTransport";
import { OtlpTracesExporter } from "./OtlpTracesExporter";
import type { SpanId } from "./SpanId";
import type { TraceId } from "./TraceId";

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
  serviceName: "trace-demo",
  headers: { "x-api-key": "secret" },
} as const;

function createDeterministicInner(): InMemoryTracer {
  let spanSeq = 0;
  let clock = 5000n;
  return new InMemoryTracer({
    idFactory: {
      nextTraceId: () => "aabbccddeeff00112233445566778899" as TraceId,
      nextSpanId: () => {
        spanSeq += 1;
        return `span${String(spanSeq).padStart(4, "0")}` as SpanId;
      },
    },
    clock: () => {
      const value = String(clock);
      clock += 10n;
      return value;
    },
  });
}

async function assertTracesExport(): Promise<void> {
  console.log(
    "[observability] OtlpTracesExporter posts /v1/traces with service.name...",
  );
  const transport = new FakeOtlpHttpTransport();
  const exporter = new OtlpTracesExporter(CONFIG, transport);
  await exporter.export([
    {
      traceId: "aabbccddeeff00112233445566778899",
      spanId: "span0001",
      parentSpanId: "span0000",
      name: "http.request",
      attributes: { "http.method": "GET", n: 1, ok: true },
      startTimeUnixNano: "100",
      endTimeUnixNano: "200",
      status: "ok",
    },
  ]);
  assertEqual(transport.requests.length, 1, "one request");
  const request = transport.requests[0]!;
  assertEqual(request.path, "http://collector:4318/v1/traces", "traces path");
  assertEqual(request.headers["x-api-key"], "secret", "header");
  const payload = JSON.parse(request.body) as {
    resourceSpans: Array<{
      resource: {
        attributes: Array<{ key: string; value: { stringValue: string } }>;
      };
      scopeSpans: Array<{
        spans: Array<{
          name: string;
          status: { code: number };
          attributes: Array<{ key: string }>;
          parentSpanId?: string;
        }>;
      }>;
    }>;
  };
  assertEqual(
    payload.resourceSpans[0]!.resource.attributes[0]!.value.stringValue,
    "trace-demo",
    "service.name",
  );
  const span = payload.resourceSpans[0]!.scopeSpans[0]!.spans[0]!;
  assertEqual(span.name, "http.request", "span name");
  assertEqual(span.status.code, 1, "OK code");
  assertEqual(span.parentSpanId, "span0000", "parentSpanId");
  assertEqual(span.attributes[0]!.key, "http.method", "sorted attrs");
}

async function assertNon2xxThrows(): Promise<void> {
  console.log("[observability] OtlpTracesExporter throws on non-2xx...");
  const transport = new FakeOtlpHttpTransport();
  transport.nextStatus = 503;
  const exporter = new OtlpTracesExporter(CONFIG, transport);
  await assertThrowsAsync(
    () =>
      exporter.export([
        {
          traceId: "t",
          spanId: "s",
          name: "x",
          attributes: {},
          startTimeUnixNano: "1",
          endTimeUnixNano: "2",
          status: "unset",
        },
      ]),
    "503",
  );
}

async function assertExportingTracerFlush(): Promise<void> {
  console.log(
    "[observability] ExportingTracer buffers then forceFlush to /v1/traces...",
  );
  const transport = new FakeOtlpHttpTransport();
  const tracer = new ExportingTracer(
    createDeterministicInner(),
    new OtlpTracesExporter(CONFIG, transport),
  );
  const span = tracer.startSpan("http.request", {
    attributes: { "http.method": "GET" },
  });
  span.end("ok", { "http.status_code": 200 });
  assertEqual(tracer.getBufferedCount(), 1, "buffered");
  await tracer.forceFlush();
  assertEqual(tracer.getBufferedCount(), 0, "cleared");
  assertEqual(transport.requests.length, 1, "exported");
  assertEqual(
    transport.requests[0]!.path,
    "http://collector:4318/v1/traces",
    "path",
  );
}

async function assertExportingTracerKeepsBufferOnFailure(): Promise<void> {
  console.log(
    "[observability] ExportingTracer keeps buffer when export fails...",
  );
  const transport = new FakeOtlpHttpTransport();
  transport.nextStatus = 500;
  const tracer = new ExportingTracer(
    createDeterministicInner(),
    new OtlpTracesExporter(CONFIG, transport),
  );
  tracer.startSpan("fail").end("error");
  assertEqual(tracer.getBufferedCount(), 1, "buffered before flush");
  await assertThrowsAsync(() => tracer.forceFlush(), "500");
  assertEqual(tracer.getBufferedCount(), 1, "buffer retained");
}

async function main(): Promise<void> {
  await assertTracesExport();
  await assertNon2xxThrows();
  await assertExportingTracerFlush();
  await assertExportingTracerKeepsBufferOnFailure();
  console.log("OTLP traces exporter validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
