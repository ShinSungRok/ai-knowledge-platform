import { toPrometheusText } from "./prometheusText";
import type { MetricPoint } from "./MetricPoint";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function main(): void {
  const points: readonly MetricPoint[] = [
    {
      name: "custom_requests",
      value: 1,
      attributes: { source: "test" },
    },
    {
      name: "escape_metric",
      value: 3,
      attributes: {
        note: 'a"b\\c\nd',
      },
    },
    {
      name: "http.requests",
      value: 1,
      attributes: { status: "200", path: "/metrics", method: "GET" },
    },
  ];

  const body = toPrometheusText(points);
  const expected =
    '# HELP custom_requests custom_requests\n' +
    '# TYPE custom_requests counter\n' +
    'custom_requests{source="test"} 1\n' +
    '# HELP escape_metric escape_metric\n' +
    '# TYPE escape_metric counter\n' +
    'escape_metric{note="a\\"b\\\\c\\nd"} 3\n' +
    '# HELP http.requests http.requests\n' +
    '# TYPE http.requests counter\n' +
    'http.requests{method="GET",path="/metrics",status="200"} 1\n';

  assertEqual(body, expected, "prometheus body");
  console.log("toPrometheusText validation succeeded.");
}

main();

