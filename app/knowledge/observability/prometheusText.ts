import type { MetricPoint } from "./MetricPoint";

function escapeLabelValue(value: string): string {
  // Prometheus label value escaping (minimal subset):
  // - backslash must be escaped
  // - double-quote must be escaped
  // - newlines must become '\n' sequences
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function formatLabels(attributes: Readonly<Record<string, string>>): string {
  const keys = Object.keys(attributes).sort();
  if (keys.length === 0) {
    return "";
  }
  const parts = keys.map((key) => {
    const value = escapeLabelValue(attributes[key]!);
    return `${key}="${value}"`;
  });
  return `{${parts.join(",")}}`;
}

/**
 * Deterministically serializes counter-like {@link MetricPoint}s into a
 * Prometheus text exposition body.
 *
 * Input points should already be ordered by `name` then label-signature
 * (e.g. `Metrics.getPoints()`), so this function only preserves that order.
 */
export function toPrometheusText(points: readonly MetricPoint[]): string {
  const lines: string[] = [];
  let currentName: string | null = null;

  for (const point of points) {
    if (currentName !== point.name) {
      currentName = point.name;
      // Per-name HELP/TYPE lines first (2-line header).
      lines.push(`# HELP ${point.name} ${point.name}`);
      lines.push(`# TYPE ${point.name} counter`);
    }

    const labels = formatLabels(point.attributes);
    if (labels === "") {
      lines.push(`${point.name} ${String(point.value)}`);
    } else {
      lines.push(`${point.name}${labels} ${String(point.value)}`);
    }
  }

  // Prometheus text format bodies are typically newline-terminated.
  return `${lines.join("\n")}\n`;
}

