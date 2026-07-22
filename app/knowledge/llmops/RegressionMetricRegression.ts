/**
 * One metric regression detected by {@link RegressionHarness}.
 */
export interface RegressionMetricRegression {
  metricKey: string;
  baseline: number;
  candidate: number;
  delta: number;
}
