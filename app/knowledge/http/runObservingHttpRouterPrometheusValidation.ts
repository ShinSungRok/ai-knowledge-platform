import { DefaultHttpRouter } from "./DefaultHttpRouter";
import { ObservingHttpRouter } from "./ObservingHttpRouter";
import { InMemoryLogger } from "../observability/InMemoryLogger";
import { InMemoryMetrics } from "../observability/InMemoryMetrics";

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

function assertDeepEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  // Deterministic keys ordering for plain objects is relied on here.
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message} (actual=${JSON.stringify(
        actual,
      )}, expected=${JSON.stringify(expected)})`,
    );
  }
}

async function assertPrometheusMetricsScrape(): Promise<void> {
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();

  // Seed a deterministic custom metric so we can assert the response body.
  metrics.increment("custom_requests", { source: "test" });

  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/metrics",
      handler: async () => {
        throw new Error("inner /metrics handler must not be called");
      },
    },
  ]);

  const router = new ObservingHttpRouter(inner, logger, metrics);

  const response = await router.handle({
    method: "GET",
    path: "/metrics",
    headers: {},
  });

  assertEqual(response.status, 200, "status");
  assertEqual(
    response.headers["content-type"],
    "text/plain; version=0.0.4",
    "content-type",
  );
  assertTruthy(typeof response.body === "string", "body must be string");
  const body = response.body as string;

  // Core scrape content: our seeded metric line must be present.
  assertTruthy(
    body.includes('custom_requests{source="test"} 1\n') ||
      body.includes('custom_requests{source="test"} 1'),
    "custom_requests metric line",
  );

  // Self-reference prevention sanity check (not strictly required, but
  // helps lock the snapshot timing).
  assertTruthy(!body.includes("# HELP http.requests "), "no self http.requests HELP");

  const events = logger.getEvents();
  assertEqual(events.length, 2, "start + finish logs");
  assertEqual(events[0]!.message, "http.request.start", "start message");
  assertEqual(events[1]!.message, "http.request.finish", "finish message");
  assertDeepEqual(
    events[0]!.attributes,
    { method: "GET", path: "/metrics" },
    "start attributes",
  );
  assertDeepEqual(
    events[1]!.attributes,
    { method: "GET", path: "/metrics", status: 200 },
    "finish attributes",
  );

  const points = metrics.getPoints();
  const httpRequestsPoint = points.find(
    (p) => p.name === "http.requests",
  );
  assertTruthy(httpRequestsPoint, "http.requests metric point");
  assertDeepEqual(
    httpRequestsPoint!.attributes,
    { method: "GET", path: "/metrics", status: "200" },
    "http.requests attributes",
  );
  assertEqual(httpRequestsPoint!.value, 1, "http.requests value");
}

async function main(): Promise<void> {
  await assertPrometheusMetricsScrape();
  console.log("ObservingHttpRouter Prometheus scrape validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

