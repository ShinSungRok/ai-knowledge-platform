import type { MetricPoint } from "./MetricPoint";

/**
 * Counter-style metrics port. `increment` adds 1 (or accumulates) for a
 * name + attribute signature.
 */
export interface Metrics {
  increment(
    name: string,
    attributes?: Readonly<Record<string, string>>,
  ): void;
  getPoints(): readonly MetricPoint[];
}
