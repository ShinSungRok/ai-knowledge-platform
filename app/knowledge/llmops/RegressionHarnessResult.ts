import type { RegressionMetricRegression } from "./RegressionMetricRegression";

/**
 * Aggregate regression harness outcome: `passed` when `regressions` is empty.
 */
export interface RegressionHarnessResult {
  passed: boolean;
  regressions: readonly RegressionMetricRegression[];
}
