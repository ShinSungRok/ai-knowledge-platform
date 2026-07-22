import { InMemoryTracer } from "./InMemoryTracer";
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

async function main(): Promise<void> {
  console.log(
    "[observability] InMemoryTracer records ended spans with injectable ids...",
  );
  let traceSeq = 0;
  let spanSeq = 0;
  let clock = 1000n;
  const tracer = new InMemoryTracer({
    idFactory: {
      nextTraceId: () => {
        traceSeq += 1;
        return `t${String(traceSeq).padStart(2, "0")}` as TraceId;
      },
      nextSpanId: () => {
        spanSeq += 1;
        return `s${String(spanSeq).padStart(2, "0")}` as SpanId;
      },
    },
    clock: () => {
      const value = String(clock);
      clock += 1n;
      return value;
    },
  });

  const root = tracer.startSpan("root", { attributes: { a: 1 } });
  const child = tracer.startSpan("child", {
    parent: root,
    attributes: { b: "x" },
  });
  child.end("ok", { c: true });
  root.end("error");

  const ended = tracer.getEndedSpans();
  assertEqual(ended.length, 2, "ended count");
  assertEqual(ended[0]!.name, "child", "first ended is child");
  assertEqual(ended[0]!.traceId, "t01", "shared trace");
  assertEqual(ended[0]!.parentSpanId, root.spanId, "parent");
  assertEqual(ended[0]!.status, "ok", "child status");
  assertEqual(ended[0]!.attributes.c, true, "end attr merged");
  assertEqual(ended[0]!.startTimeUnixNano, "1001", "child start");
  assertEqual(ended[0]!.endTimeUnixNano, "1002", "child end");
  assertEqual(ended[1]!.status, "error", "root status");

  (ended[0]!.attributes as Record<string, unknown>).c = false;
  assertEqual(
    tracer.getEndedSpans()[0]!.attributes.c,
    true,
    "getEndedSpans defensive copy",
  );

  await tracer.forceFlush();
  tracer.clear();
  assertEqual(tracer.getEndedSpans().length, 0, "cleared");
  assertTruthy(true, "ok");
  console.log("InMemoryTracer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
