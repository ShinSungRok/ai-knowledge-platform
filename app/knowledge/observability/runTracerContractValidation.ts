import type { Span } from "./Span";
import type { SpanAttributes } from "./SpanAttributes";
import type { SpanId } from "./SpanId";
import type { SpanStatus } from "./SpanStatus";
import type { TraceId } from "./TraceId";
import type { Tracer } from "./Tracer";

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

type RecordedEnd = {
  spanId: SpanId;
  status: SpanStatus;
  attributes: SpanAttributes;
};

/**
 * Minimal Fake Tracer for contract validation (no OTLP export).
 */
class FakeTracer implements Tracer {
  readonly ends: RecordedEnd[] = [];
  private next = 1;

  startSpan(
    name: string,
    options?: {
      parent?: Span;
      attributes?: SpanAttributes;
    },
  ): Span {
    const traceId = (options?.parent?.traceId ??
      `trace${String(this.next).padStart(2, "0")}`) as TraceId;
    const spanId = `span${String(this.next).padStart(2, "0")}` as SpanId;
    this.next += 1;
    const attributes: SpanAttributes = {
      ...(options?.attributes ?? {}),
    };
    let ended = false;
    const span: Span = {
      traceId,
      spanId,
      parentSpanId: options?.parent?.spanId,
      name,
      attributes,
      startTimeUnixNano: "1000",
      end: (status?: SpanStatus, endAttributes?: SpanAttributes) => {
        if (ended) {
          throw new Error("span already ended");
        }
        ended = true;
        this.ends.push({
          spanId,
          status: status ?? "unset",
          attributes: { ...attributes, ...(endAttributes ?? {}) },
        });
      },
    };
    return span;
  }

  async forceFlush(): Promise<void> {
    // no-op
  }
}

function assertStartAndEndWithParent(): void {
  console.log(
    "[observability] Fake Tracer startSpan/end records parent + status...",
  );
  const tracer: Tracer = new FakeTracer();
  const fake = tracer as FakeTracer;

  const root = tracer.startSpan("root", {
    attributes: { kind: "root" },
  });
  assertEqual(root.name, "root", "root name");
  assertTruthy(root.traceId.length > 0, "traceId");
  assertTruthy(root.spanId.length > 0, "spanId");
  assertEqual(root.parentSpanId, undefined, "root has no parent");

  const child = tracer.startSpan("child", {
    parent: root,
    attributes: { step: 1 },
  });
  assertEqual(child.traceId, root.traceId, "child shares traceId");
  assertEqual(child.parentSpanId, root.spanId, "child parentSpanId");

  child.end("ok", { result: true });
  root.end("error");

  assertEqual(fake.ends.length, 2, "two ends");
  assertEqual(fake.ends[0]!.spanId, child.spanId, "child ended first");
  assertEqual(fake.ends[0]!.status, "ok", "child status");
  assertEqual(fake.ends[0]!.attributes.result, true, "child end attr");
  assertEqual(fake.ends[1]!.status, "error", "root status");
}

async function assertForceFlushOptional(): Promise<void> {
  console.log("[observability] Tracer.forceFlush is optional and awaitable...");
  const tracer: Tracer = new FakeTracer();
  assertTruthy(typeof tracer.forceFlush === "function", "forceFlush present");
  await tracer.forceFlush!();
}

async function main(): Promise<void> {
  assertStartAndEndWithParent();
  await assertForceFlushOptional();
  console.log("Tracer contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
