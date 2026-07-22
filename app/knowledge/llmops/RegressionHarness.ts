import type { RegressionHarnessResult } from "./RegressionHarnessResult";

/**
 * Input for comparing candidate metrics against a baseline.
 *
 * Default semantics (see {@link DefaultRegressionHarness}): higher-is-better
 * metrics; regression when `candidate < baseline - tolerance` (tolerance
 * defaults to 0 per key). Missing candidate key → regression with candidate
 * treated as 0 and `delta = candidate - baseline`.
 */
export interface RegressionHarnessInput {
  baseline: Readonly<Record<string, number>>;
  candidate: Readonly<Record<string, number>>;
  tolerances?: Readonly<Record<string, number>>;
}

/**
 * Pure port for numeric-metric regression detection against a baseline.
 *
 * No persistence store this Sprint. Does not change ExperimentRunStore API.
 */
export interface RegressionHarness {
  compare(input: RegressionHarnessInput): RegressionHarnessResult;
}
