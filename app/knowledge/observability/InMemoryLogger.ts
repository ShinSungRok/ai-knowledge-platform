import type { LogEvent } from "./LogEvent";
import type { Logger } from "./Logger";

/**
 * In-memory {@link Logger}: stores events in call order and returns
 * defensive copies from {@link getEvents}.
 */
export class InMemoryLogger implements Logger {
  private readonly events: LogEvent[] = [];

  log(event: LogEvent): void {
    this.events.push({
      level: event.level,
      message: event.message,
      attributes: { ...event.attributes },
    });
  }

  getEvents(): readonly LogEvent[] {
    return this.events.map((event) => ({
      level: event.level,
      message: event.message,
      attributes: { ...event.attributes },
    }));
  }

  clear(): void {
    this.events.length = 0;
  }
}
