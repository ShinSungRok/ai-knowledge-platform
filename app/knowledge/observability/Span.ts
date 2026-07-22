import type { SpanAttributes } from "./SpanAttributes";
import type { SpanId } from "./SpanId";
import type { SpanStatus } from "./SpanStatus";
import type { TraceId } from "./TraceId";

/**
 * In-flight span. Call {@link Span.end} exactly once when the operation finishes.
 */
export interface Span {
  readonly traceId: TraceId;
  readonly spanId: SpanId;
  readonly parentSpanId?: SpanId;
  readonly name: string;
  readonly attributes: SpanAttributes;
  /** Decimal nanoseconds since Unix epoch (OTLP JSON string). */
  readonly startTimeUnixNano: string;
  end(
    status?: SpanStatus,
    attributes?: SpanAttributes,
  ): void;
}
