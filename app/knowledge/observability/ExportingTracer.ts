import type { EndedSpan } from "./EndedSpan";
import type { InMemoryTracer } from "./InMemoryTracer";
import type { OtlpTracesExporter } from "./OtlpTracesExporter";
import type { Span } from "./Span";
import type { SpanAttributes } from "./SpanAttributes";
import type { SpanStatus } from "./SpanStatus";
import type { Tracer } from "./Tracer";

/**
 * {@link Tracer} that mirrors spans to an inner {@link InMemoryTracer} and
 * buffers ended snapshots for OTLP flush. On export failure the buffer is
 * retained and the error is rethrown.
 */
export class ExportingTracer implements Tracer {
  private readonly buffer: EndedSpan[] = [];

  constructor(
    private readonly inner: InMemoryTracer,
    private readonly exporter: OtlpTracesExporter,
  ) {}

  startSpan(
    name: string,
    options?: {
      parent?: Span;
      attributes?: SpanAttributes;
    },
  ): Span {
    const innerSpan = this.inner.startSpan(name, options);
    return {
      traceId: innerSpan.traceId,
      spanId: innerSpan.spanId,
      parentSpanId: innerSpan.parentSpanId,
      name: innerSpan.name,
      attributes: innerSpan.attributes,
      startTimeUnixNano: innerSpan.startTimeUnixNano,
      end: (status?: SpanStatus, endAttributes?: SpanAttributes) => {
        innerSpan.end(status, endAttributes);
        const ended = this.inner
          .getEndedSpans()
          .find((span) => span.spanId === innerSpan.spanId);
        if (ended === undefined) {
          throw new Error(`ended span missing: ${innerSpan.spanId}`);
        }
        this.buffer.push({
          ...ended,
          attributes: { ...ended.attributes },
        });
      },
    };
  }

  getBufferedCount(): number {
    return this.buffer.length;
  }

  async forceFlush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    const batch = this.buffer.map((span) => ({
      ...span,
      attributes: { ...span.attributes },
    }));
    await this.exporter.export(batch);
    this.buffer.length = 0;
  }
}
