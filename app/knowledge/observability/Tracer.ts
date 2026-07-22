import type { Span } from "./Span";
import type { SpanAttributes } from "./SpanAttributes";

/**
 * Distributed tracing port.
 *
 * Adapters may export OTLP/HTTP spans; official OpenTelemetry SDK and full
 * W3C propagator suite remain deferred.
 */
export interface Tracer {
  startSpan(
    name: string,
    options?: {
      parent?: Span;
      attributes?: SpanAttributes;
    },
  ): Span;
  forceFlush?(): Promise<void>;
}
