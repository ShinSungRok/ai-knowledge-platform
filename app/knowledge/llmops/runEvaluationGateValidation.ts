import { DefaultEvaluationGateEvaluator } from "./DefaultEvaluationGateEvaluator";
import type { EvaluationGateEvaluator } from "./EvaluationGateEvaluator";
import type { EvaluationGateRule } from "./EvaluationGateRule";

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

function buildEvaluator(): EvaluationGateEvaluator {
  return new DefaultEvaluationGateEvaluator();
}

function assertAllRulesPass(): void {
  console.log("[llmops-gate] all-rules-pass happy path...");
  const evaluator = buildEvaluator();
  const result = evaluator.evaluate({
    metrics: { hitRateAtK: 0.9, meanReciprocalRank: 0.8 },
    rules: [
      { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
      { metricKey: "meanReciprocalRank", comparator: "gte", threshold: 0.7 },
    ],
  });
  assertEqual(result.passed, true, "gate passed");
  assertEqual(result.ruleResults.length, 2, "two rule results");
}

function assertSingleRuleFail(): void {
  console.log("[llmops-gate] single rule fail → gate fail...");
  const evaluator = buildEvaluator();
  const result = evaluator.evaluate({
    metrics: { hitRateAtK: 0.5 },
    rules: [
      { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
    ],
  });
  assertEqual(result.passed, false, "gate failed");
  assertEqual(result.ruleResults[0]?.passed, false, "rule failed");
}

function assertMissingMetricFails(): void {
  console.log("[llmops-gate] missing metric → rule fail...");
  const evaluator = buildEvaluator();
  const result = evaluator.evaluate({
    metrics: {},
    rules: [
      { metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 },
    ],
  });
  assertEqual(result.passed, false, "gate failed");
  assertEqual(result.ruleResults[0]?.actual, undefined, "actual undefined");
  assertEqual(result.ruleResults[0]?.passed, false, "rule failed");
}

function assertComparators(): void {
  console.log("[llmops-gate] gte / lte / eq comparators...");
  const evaluator = buildEvaluator();
  const gte = evaluator.evaluate({
    metrics: { score: 0.5 },
    rules: [{ metricKey: "score", comparator: "gte", threshold: 0.5 }],
  });
  assertEqual(gte.passed, true, "gte equal passes");
  const lte = evaluator.evaluate({
    metrics: { score: 0.5 },
    rules: [{ metricKey: "score", comparator: "lte", threshold: 0.5 }],
  });
  assertEqual(lte.passed, true, "lte equal passes");
  const eq = evaluator.evaluate({
    metrics: { score: 1 },
    rules: [{ metricKey: "score", comparator: "eq", threshold: 1 }],
  });
  assertEqual(eq.passed, true, "eq passes");
  const eqFail = evaluator.evaluate({
    metrics: { score: 0.9 },
    rules: [{ metricKey: "score", comparator: "eq", threshold: 1 }],
  });
  assertEqual(eqFail.passed, false, "eq fail");
}

function assertInvalidInputThrows(): void {
  console.log("[llmops-gate] invalid input throws...");
  const evaluator = buildEvaluator();
  assertThrows(
    () => evaluator.evaluate({ metrics: {}, rules: [] }),
    "rules must not be empty",
  );
  assertThrows(
    () =>
      evaluator.evaluate({
        metrics: { score: 1 },
        rules: [{ metricKey: "  ", comparator: "gte", threshold: 1 }],
      }),
    "metricKey must be a non-empty string",
  );
}

function main(): void {
  assertAllRulesPass();
  assertSingleRuleFail();
  assertMissingMetricFails();
  assertComparators();
  assertInvalidInputThrows();
  console.log("Evaluation gate validation succeeded.");
}

main();
