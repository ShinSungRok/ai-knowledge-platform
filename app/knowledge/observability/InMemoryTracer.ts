import { randomBytes } from "node:crypto";
import type { EndedSpan } from "./EndedSpan";
import type { Span } from "./Span";
import type { SpanAttributes } from "./SpanAttributes";
import type { SpanId } from "./SpanId";
import type { SpanStatus } from "./SpanStatus";
import type { TraceId } from "./TraceId";
import type { Tracer } from "./Tracer";

export type TracerIdFactory = {
  nextTraceId: () => TraceId;
  nextSpanId: () => SpanId;
};

export type TracerClock = () => string;

function defaultIdFactory(): TracerIdFactory {
  return {
    nextTraceId: () => randomBytes(16).toString("hex") as TraceId,
    nextSpanId: () => randomBytes(8).toString("hex") as SpanId,
  };
}

function defaultClock(): TracerClock {
  return () => String(BigInt(Date.now()) * 1_000_000n);
}

/**
 * In-process {@link Tracer} that retains ended span snapshots.
 */
export class InMemoryTracer implements Tracer {
  private readonly ended: EndedSpan[] = [];
  private readonly ids: TracerIdFactory;
  private readonly clock: TracerClock;

  constructor(options?: {
    idFactory?: TracerIdFactory;
    clock?: TracerClock;
  }) {
    this.ids = options?.idFactory ?? defaultIdFactory();
    this.clock = options?.clock ?? defaultClock();
  }

  startSpan(
    name: string,
    options?: {
      parent?: Span;
      attributes?: SpanAttributes;
    },
  ): Span {
    const parent = options?.parent;
    const traceId = parent?.traceId ?? this.ids.nextTraceId();
    const spanId = this.ids.nextSpanId();
    const startAttributes: SpanAttributes = {
      ...(options?.attributes ?? {}),
    };
    const startTimeUnixNano = this.clock();
    let ended = false;

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parent?.spanId,
      name,
      attributes: startAttributes,
      startTimeUnixNano,
      end: (status?: SpanStatus, endAttributes?: SpanAttributes) => {
        if (ended) {
          throw new Error(`span already ended: ${spanId}`);
        }
        ended = true;
        const merged: SpanAttributes = {
          ...startAttributes,
          ...(endAttributes ?? {}),
        };
        this.ended.push({
          traceId,
          spanId,
          parentSpanId: parent?.spanId,
          name,
          attributes: { ...merged },
          startTimeUnixNano,
          endTimeUnixNano: this.clock(),
          status: status ?? "unset",
        });
      },
    };
    return span;
  }

  getEndedSpans(): readonly EndedSpan[] {
    return this.ended.map((span) => ({
      ...span,
      attributes: { ...span.attributes },
    }));
  }

  clear(): void {
    this.ended.length = 0;
  }

  async forceFlush(): Promise<void> {
    // no-op
  }
}
