/**
 * A single recorded metric sample.
 */
export interface MetricPoint {
  name: string;
  value: number;
  attributes: Readonly<Record<string, string>>;
}
