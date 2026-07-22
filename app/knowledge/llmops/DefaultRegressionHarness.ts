import type {
  RegressionHarness,
  RegressionHarnessInput,
} from "./RegressionHarness";
import type { RegressionHarnessResult } from "./RegressionHarnessResult";
import type { RegressionMetricRegression } from "./RegressionMetricRegression";

/**
 * Deterministic {@link RegressionHarness}: higher-is-better metrics;
 * regression when `candidate < baseline - tolerance`.
 *
 * Missing candidate key → candidate treated as 0. Tolerance defaults to 0
 * per baseline key. Empty baseline throws. Does not mutate input maps.
 */
export class DefaultRegressionHarness implements RegressionHarness {
  compare(input: RegressionHarnessInput): RegressionHarnessResult {
    const { baseline, candidate, tolerances } = this.toInput(input);
    const regressions: RegressionMetricRegression[] = [];

    for (const [metricKey, baselineValue] of Object.entries(baseline)) {
      const candidateValue = candidate[metricKey] ?? 0;
      const tolerance = tolerances?.[metricKey] ?? 0;
      if (candidateValue < baselineValue - tolerance) {
        regressions.push({
          metricKey,
          baseline: baselineValue,
          candidate: candidateValue,
          delta: candidateValue - baselineValue,
        });
      }
    }

    return {
      passed: regressions.length === 0,
      regressions,
    };
  }

  private toInput(input: RegressionHarnessInput): RegressionHarnessInput {
    if (!input || typeof input !== "object") {
      throw new Error("RegressionHarnessInput must be an object");
    }
    if (!input.baseline || typeof input.baseline !== "object") {
      throw new Error("baseline must be an object");
    }
    if (!input.candidate || typeof input.candidate !== "object") {
      throw new Error("candidate must be an object");
    }
    const baselineKeys = Object.keys(input.baseline);
    if (baselineKeys.length === 0) {
      throw new Error("baseline must not be empty");
    }
    const baseline = this.copyNumberMap(input.baseline, "baseline");
    const candidate = this.copyNumberMap(input.candidate, "candidate");
    const tolerances =
      input.tolerances !== undefined
        ? this.copyNumberMap(input.tolerances, "tolerances")
        : undefined;
    return { baseline, candidate, tolerances };
  }

  private copyNumberMap(
    map: Readonly<Record<string, number>>,
    field: string,
  ): Record<string, number> {
    const copied: Record<string, number> = {};
    for (const [key, value] of Object.entries(map)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${field}.${key} must be a finite number`);
      }
      copied[key] = value;
    }
    return copied;
  }
}
