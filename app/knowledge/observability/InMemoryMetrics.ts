import type { MetricPoint } from "./MetricPoint";
import type { Metrics } from "./Metrics";

/**
 * In-memory {@link Metrics}: accumulates counters by name + sorted
 * attribute signature. {@link getPoints} returns name ascending, then
 * signature ascending within the same name.
 */
export class InMemoryMetrics implements Metrics {
  private readonly points = new Map<string, MetricPoint>();

  increment(
    name: string,
    attributes: Readonly<Record<string, string>> = {},
  ): void {
    const normalized = normalizeAttributes(attributes);
    const signature = attributeSignature(normalized);
    const key = `${name}\0${signature}`;
    const existing = this.points.get(key);
    if (existing) {
      this.points.set(key, {
        name: existing.name,
        value: existing.value + 1,
        attributes: existing.attributes,
      });
      return;
    }
    this.points.set(key, {
      name,
      value: 1,
      attributes: normalized,
    });
  }

  getPoints(): readonly MetricPoint[] {
    return [...this.points.values()]
      .map((point) => ({
        name: point.name,
        value: point.value,
        attributes: { ...point.attributes },
      }))
      .sort((a, b) => {
        if (a.name !== b.name) {
          return a.name < b.name ? -1 : 1;
        }
        const sigA = attributeSignature(a.attributes);
        const sigB = attributeSignature(b.attributes);
        if (sigA === sigB) {
          return 0;
        }
        return sigA < sigB ? -1 : 1;
      });
  }
}

function normalizeAttributes(
  attributes: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const copy: Record<string, string> = {};
  for (const key of Object.keys(attributes).sort()) {
    copy[key] = attributes[key]!;
  }
  return copy;
}

function attributeSignature(
  attributes: Readonly<Record<string, string>>,
): string {
  return Object.keys(attributes)
    .sort()
    .map((key) => `${key}=${attributes[key]}`)
    .join("&");
}
