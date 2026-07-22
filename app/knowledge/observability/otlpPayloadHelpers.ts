/**
 * Builds OTLP signal paths against a collector base endpoint.
 * Avoids duplicating `/v1/logs`, `/v1/metrics`, or `/v1/traces` when already present.
 */
export function resolveOtlpSignalUrl(
  endpoint: string,
  signalPath: "/v1/logs" | "/v1/metrics" | "/v1/traces",
): string {
  const base = endpoint.replace(/\/+$/, "");
  if (base.endsWith(signalPath)) {
    return base;
  }
  return `${base}${signalPath}`;
}

export function sortAttributeKeys(
  attributes: Readonly<Record<string, string | number | boolean>>,
): string[] {
  return Object.keys(attributes).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
}

export function toOtlpAnyValue(
  value: string | number | boolean,
): Record<string, unknown> {
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  if (Number.isInteger(value)) {
    return { intValue: value };
  }
  return { doubleValue: value };
}

export function attributesToOtlpKeyValues(
  attributes: Readonly<Record<string, string | number | boolean>>,
): Array<{ key: string; value: Record<string, unknown> }> {
  return sortAttributeKeys(attributes).map((key) => ({
    key,
    value: toOtlpAnyValue(attributes[key]!),
  }));
}
