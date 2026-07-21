import type { LogEvent } from "./LogEvent";
import type { Logger } from "./Logger";
import type { OtlpLogsExporter } from "./OtlpLogsExporter";

/**
 * {@link Logger} that mirrors events to an inner logger and buffers them
 * for OTLP flush. `log` stays sync; export happens only in `flush`.
 * On export failure the buffer is retained and the error is rethrown.
 */
export class ExportingLogger implements Logger {
  private readonly buffer: LogEvent[] = [];

  constructor(
    private readonly inner: Logger,
    private readonly exporter: OtlpLogsExporter,
  ) {}

  log(event: LogEvent): void {
    this.inner.log(event);
    this.buffer.push({
      level: event.level,
      message: event.message,
      attributes: { ...event.attributes },
    });
  }

  getBufferedCount(): number {
    return this.buffer.length;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }
    const batch = this.buffer.map((event) => ({
      level: event.level,
      message: event.message,
      attributes: { ...event.attributes },
    }));
    await this.exporter.export(batch);
    this.buffer.length = 0;
  }
}
