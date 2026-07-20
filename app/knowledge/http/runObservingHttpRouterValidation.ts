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

async function assertLogsAndMetricsOnSuccess(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter logs start/finish and increments http.requests...",
  );
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: 200,
        headers: { "content-type": "application/json" },
        body: { status: "ok" },
      }),
    },
  ]);
  const router = new ObservingHttpRouter(inner, logger, metrics);
  const response = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(response.status, 200, "status");
  const events = logger.getEvents();
  assertEqual(events.length, 2, "start + finish");
  assertEqual(events[0]!.message, "http.request.start", "start message");
  assertEqual(events[1]!.message, "http.request.finish", "finish message");
  assertEqual(events[1]!.attributes.status, 200, "finish status attr");
  const points = metrics.getPoints();
  assertEqual(points.length, 1, "one metric point");
  assertEqual(points[0]!.name, "http.requests", "metric name");
  assertEqual(points[0]!.value, 1, "metric value");
  assertEqual(points[0]!.attributes.status, "200", "metric status string");
}

async function assertErrorLogAndRethrow(): Promise<void> {
  console.log(
    "[http] ObservingHttpRouter logs http.request.error and rethrows...",
  );
  const logger = new InMemoryLogger();
  const metrics = new InMemoryMetrics();
  const inner = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/boom",
      handler: async () => {
        throw new Error("inner boom");
      },
    },
  ]);
  const router = new ObservingHttpRouter(inner, logger, metrics);
  let caught: unknown;
  try {
    await router.handle({ method: "GET", path: "/boom", headers: {} });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must rethrow");
  assertEqual((caught as Error).message, "inner boom", "error message");
  const events = logger.getEvents();
  assertEqual(events[0]!.message, "http.request.start", "start");
  assertEqual(events[1]!.message, "http.request.error", "error log");
  assertEqual(metrics.getPoints().length, 0, "no success metric on throw");
}

async function main(): Promise<void> {
  await assertLogsAndMetricsOnSuccess();
  await assertErrorLogAndRethrow();
  console.log("ObservingHttpRouter validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
