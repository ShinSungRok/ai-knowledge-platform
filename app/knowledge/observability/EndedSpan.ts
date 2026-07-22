import type { SpanAttributes } from "./SpanAttributes";
import type { SpanId } from "./SpanId";
import type { SpanStatus } from "./SpanStatus";
import type { TraceId } from "./TraceId";

/**
 * Immutable snapshot of a completed span.
 */
export interface EndedSpan {
  readonly traceId: TraceId;
  readonly spanId: SpanId;
  readonly parentSpanId?: SpanId;
  readonly name: string;
  readonly attributes: SpanAttributes;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly status: SpanStatus;
}
