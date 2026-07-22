import { DefaultRegressionHarness } from "./DefaultRegressionHarness";
import type { RegressionHarness } from "./RegressionHarness";

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertThrows(fn: () => unknown, messageSubstring: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected throw containing: ${messageSubstring}`);
}

function buildHarness(): RegressionHarness {
  return new DefaultRegressionHarness();
}

function assertNoRegressionHappyPath(): void {
  console.log("[llmops-regression] no regression happy path...");
  const harness = buildHarness();
  const result = harness.compare({
    baseline: { hitRateAtK: 0.8, meanReciprocalRank: 0.7 },
    candidate: { hitRateAtK: 0.85, meanReciprocalRank: 0.75 },
  });
  assertEqual(result.passed, true, "passed");
  assertEqual(result.regressions.length, 0, "no regressions");
}

function assertCandidateDropRegression(): void {
  console.log("[llmops-regression] candidate drop below baseline...");
  const harness = buildHarness();
  const result = harness.compare({
    baseline: { hitRateAtK: 0.9 },
    candidate: { hitRateAtK: 0.7 },
  });
  assertEqual(result.passed, false, "failed");
  assertEqual(result.regressions.length, 1, "one regression");
  assertEqual(result.regressions[0]?.metricKey, "hitRateAtK", "metric key");
  assertTruthy(
    Math.abs((result.regressions[0]?.delta ?? 0) + 0.2) < 1e-9,
    "delta approximately -0.2",
  );
}

function assertTolerancePreventsRegression(): void {
  console.log("[llmops-regression] tolerance prevents false regression...");
  const harness = buildHarness();
  const result = harness.compare({
    baseline: { hitRateAtK: 0.9 },
    candidate: { hitRateAtK: 0.85 },
    tolerances: { hitRateAtK: 0.1 },
  });
  assertEqual(result.passed, true, "passed with tolerance");
}

function assertMissingCandidateKeyRegression(): void {
  console.log("[llmops-regression] missing candidate key → regression...");
  const harness = buildHarness();
  const result = harness.compare({
    baseline: { hitRateAtK: 0.8 },
    candidate: {},
  });
  assertEqual(result.passed, false, "failed");
  assertEqual(result.regressions[0]?.candidate, 0, "candidate treated as 0");
  assertTruthy(
    Math.abs((result.regressions[0]?.delta ?? 0) + 0.8) < 1e-9,
    "delta approximately -0.8",
  );
}

function assertEmptyBaselineThrows(): void {
  console.log("[llmops-regression] empty baseline throws...");
  const harness = buildHarness();
  assertThrows(
    () => harness.compare({ baseline: {}, candidate: { hitRateAtK: 0.5 } }),
    "baseline must not be empty",
  );
}

function assertDefensiveCopy(): void {
  console.log("[llmops-regression] input maps not mutated...");
  const harness = buildHarness();
  const baseline = { hitRateAtK: 0.8 };
  const candidate = { hitRateAtK: 0.9 };
  harness.compare({ baseline, candidate });
  baseline.hitRateAtK = 0;
  candidate.hitRateAtK = 0;
  const result = harness.compare({
    baseline: { hitRateAtK: 0.8 },
    candidate: { hitRateAtK: 0.9 },
  });
  assertEqual(result.passed, true, "still passes after prior mutation attempt");
}

function main(): void {
  assertNoRegressionHappyPath();
  assertCandidateDropRegression();
  assertTolerancePreventsRegression();
  assertMissingCandidateKeyRegression();
  assertEmptyBaselineThrows();
  assertDefensiveCopy();
  console.log("Regression harness validation succeeded.");
}

main();
