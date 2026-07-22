import { DefaultHttpRouter } from "./DefaultHttpRouter";
import { ObservingHttpRouter } from "./ObservingHttpRouter";
import { InMemoryLogger } from "../observability/InMemoryLogger";
import { InMemoryMetrics } from "../observability/InMemoryMetrics";
import { InMemoryTracer } from "../observability/InMemoryTracer";
import type { SpanId } from "../observability/SpanId";
import type { TraceId } from "../observability/TraceId";

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

async function assertSuccessSpan(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter records ok http.request span on success...",
  );
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const tracer = new InMemoryTracer({
    idFactory: {
      nextTraceId: () => "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as TraceId,
      nextSpanId: () => "bbbbbbbbbbbbbbbb" as SpanId,
    },
  });
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: 200,
        headers: { "content-type": "application/json" },
        body: { status: "ok" },
      }),
    },
  ]);
  const router = new ObservingHttpRouter(inner, logger, metrics, tracer);
  const response = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(response.status, 200, "status");
  const ended = tracer.getEndedSpans();
  assertEqual(ended.length, 1, "one span");
  assertEqual(ended[0]!.name, "http.request", "span name");
  assertEqual(ended[0]!.status, "ok", "span status");
  assertEqual(ended[0]!.attributes["http.method"], "GET", "method attr");
  assertEqual(ended[0]!.attributes["http.route"], "/health", "route attr");
  assertEqual(ended[0]!.attributes["http.status_code"], 200, "status attr");
  assertEqual(logger.getEvents().length, 2, "logs preserved");
  assertEqual(metrics.getPoints().length, 1, "metrics preserved");
}

async function assertErrorSpan(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter records error span and rethrows...",
  );
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const tracer = new InMemoryTracer();
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/boom",
      handler: async () => {
        throw new Error("inner boom");
      },
    },
  ]);
  const router = new ObservingHttpRouter(inner, logger, metrics, tracer);
  let caught: unknown;
  try {
    await router.handle({ method: "GET", path: "/boom", headers: {} });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "rethrow");
  const ended = tracer.getEndedSpans();
  assertEqual(ended.length, 1, "one span");
  assertEqual(ended[0]!.status, "error", "error status");
  assertEqual(logger.getEvents()[1]!.message, "http.request.error", "error log");
}

async function assertTraceparentParent(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter continues parent from traceparent header...",
  );
  const tracer = new InMemoryTracer({
    idFactory: {
      nextTraceId: () => "should-not-be-used-as-root" as TraceId,
      nextSpanId: () => "cccccccccccccccc" as SpanId,
    },
  });
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: 200,
        headers: {},
        body: {},
      }),
    },
  ]);
  const router = new ObservingHttpRouter(
    inner,
    new InMemoryLogger(),
    new InMemoryMetrics(),
    tracer,
  );
  await router.handle({
    method: "GET",
    path: "/health",
    headers: {
      traceparent:
        "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
    },
  });
  const ended = tracer.getEndedSpans()[0]!;
  assertEqual(
    ended.traceId,
    "0af7651916cd43dd8448eb211c80319c",
    "inherits remote traceId",
  );
  assertEqual(
    ended.parentSpanId,
    "b7ad6b7169203331",
    "parent from traceparent",
  );
}

async function assertWithoutTracer(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter without tracer keeps prior behavior...",
  );
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: 200,
        headers: {},
        body: {},
      }),
    },
  ]);
  const router = new ObservingHttpRouter(inner, logger, metrics);
  const response = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(response.status, 200, "status");
  assertEqual(logger.getEvents().length, 2, "logs");
  assertEqual(metrics.getPoints()[0]!.value, 1, "metric");
}

async function main(): Promise<void> {
  await assertSuccessSpan();
  await assertErrorSpan();
  await assertTraceparentParent();
  await assertWithoutTracer();
  console.log("ObservingHttpRouter tracing validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
