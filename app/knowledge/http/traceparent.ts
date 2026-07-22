import type { Span } from "../observability/Span";
import type { SpanId } from "../observability/SpanId";
import type { TraceId } from "../observability/TraceId";

/**
 * Minimal W3C `traceparent` parse (version-traceId-spanId-flags).
 * Full propagator suite / baggage remain deferred.
 */
export function parseTraceparent(
  header: string | undefined,
): { traceId: TraceId; spanId: SpanId } | undefined {
  if (header === undefined) {
    return undefined;
  }
  const trimmed = header.trim();
  const parts = trimmed.split("-");
  if (parts.length !== 4) {
    return undefined;
  }
  const [version, traceId, spanId] = parts;
  if (version !== "00") {
    return undefined;
  }
  if (!/^[0-9a-f]{32}$/i.test(traceId ?? "")) {
    return undefined;
  }
  if (!/^[0-9a-f]{16}$/i.test(spanId ?? "")) {
    return undefined;
  }
  return {
    traceId: traceId!.toLowerCase() as TraceId,
    spanId: spanId!.toLowerCase() as SpanId,
  };
}

/**
 * Synthetic parent {@link Span} for continuing a remote trace context.
 */
export function remoteParentSpanFromTraceparent(
  header: string | undefined,
): Span | undefined {
  const parsed = parseTraceparent(header);
  if (parsed === undefined) {
    return undefined;
  }
  return {
    traceId: parsed.traceId,
    spanId: parsed.spanId,
    name: "remote.parent",
    attributes: {},
    startTimeUnixNano: "0",
    end: () => {
      // remote parent is not ended locally
    },
  };
}
