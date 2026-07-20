import type { LogLevel } from "./LogLevel";

/**
 * A single structured log event.
 */
export interface LogEvent {
  level: LogLevel;
  message: string;
  attributes: Readonly<Record<string, string | number | boolean>>;
}
