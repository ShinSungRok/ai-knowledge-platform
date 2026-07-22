import type { EvaluationGateComparator } from "./EvaluationGateComparator";
import type {
  EvaluationGateEvaluator,
  EvaluationGateEvaluatorInput,
} from "./EvaluationGateEvaluator";
import type { EvaluationGateResult } from "./EvaluationGateResult";
import type { EvaluationGateRule } from "./EvaluationGateRule";
import type { EvaluationGateRuleResult } from "./EvaluationGateRuleResult";

const VALID_COMPARATORS: readonly EvaluationGateComparator[] = [
  "gte",
  "lte",
  "eq",
];

/**
 * Deterministic {@link EvaluationGateEvaluator}: numeric-metric threshold
 * rules with `gte` / `lte` / `eq` comparators.
 *
 * Pure scoring — no constructor dependencies. Missing metric key → rule
 * fails (`actual: undefined`, `passed: false`). Empty rules array throws.
 */
export class DefaultEvaluationGateEvaluator implements EvaluationGateEvaluator {
  evaluate(input: EvaluationGateEvaluatorInput): EvaluationGateResult {
    const { metrics, rules } = this.toInput(input);
    const ruleResults: EvaluationGateRuleResult[] = rules.map((rule) =>
      this.evaluateRule(metrics, rule),
    );
    return {
      passed: ruleResults.every((result) => result.passed),
      ruleResults,
    };
  }

  private evaluateRule(
    metrics: Readonly<Record<string, number>>,
    rule: EvaluationGateRule,
  ): EvaluationGateRuleResult {
    const actual = metrics[rule.metricKey];
    const passed =
      actual !== undefined &&
      this.compare(actual, rule.comparator, rule.threshold);
    return {
      metricKey: rule.metricKey,
      comparator: rule.comparator,
      threshold: rule.threshold,
      actual,
      passed,
    };
  }

  private compare(
    actual: number,
    comparator: EvaluationGateComparator,
    threshold: number,
  ): boolean {
    switch (comparator) {
      case "gte":
        return actual >= threshold;
      case "lte":
        return actual <= threshold;
      case "eq":
        return actual === threshold;
      default:
        throw new Error(`Unknown comparator: ${String(comparator)}`);
    }
  }

  private toInput(
    input: EvaluationGateEvaluatorInput,
  ): EvaluationGateEvaluatorInput {
    if (!input || typeof input !== "object") {
      throw new Error("EvaluationGateEvaluatorInput must be an object");
    }
    if (!input.metrics || typeof input.metrics !== "object") {
      throw new Error("metrics must be an object");
    }
    if (!Array.isArray(input.rules)) {
      throw new Error("rules must be an array");
    }
    if (input.rules.length === 0) {
      throw new Error("rules must not be empty");
    }
    const metrics: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.metrics)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`metrics.${key} must be a finite number`);
      }
      metrics[key] = value;
    }
    const rules = input.rules.map((rule) => this.assertRule(rule));
    return { metrics, rules };
  }

  private assertRule(rule: EvaluationGateRule): EvaluationGateRule {
    if (!rule || typeof rule !== "object") {
      throw new Error("EvaluationGateRule must be an object");
    }
    if (typeof rule.metricKey !== "string" || rule.metricKey.trim().length === 0) {
      throw new Error("metricKey must be a non-empty string");
    }
    if (
      typeof rule.comparator !== "string" ||
      !VALID_COMPARATORS.includes(rule.comparator as EvaluationGateComparator)
    ) {
      throw new Error('comparator must be "gte" | "lte" | "eq"');
    }
    if (typeof rule.threshold !== "number" || !Number.isFinite(rule.threshold)) {
      throw new Error("threshold must be a finite number");
    }
    return {
      metricKey: rule.metricKey.trim(),
      comparator: rule.comparator,
      threshold: rule.threshold,
    };
  }
}
