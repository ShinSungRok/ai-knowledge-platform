import type { LogEvent } from "./LogEvent";

/**
 * Structured logger port. Implementations must not throw for valid events.
 */
export interface Logger {
  log(event: LogEvent): void;
}
