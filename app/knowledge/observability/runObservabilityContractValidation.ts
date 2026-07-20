import { InMemoryLogger } from "./InMemoryLogger";
import { InMemoryMetrics } from "./InMemoryMetrics";
import { KNOWLEDGE_MODULE_OBSERVABILITY } from "./index";
import type { Logger } from "./Logger";
import type { Metrics } from "./Metrics";

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

function assertModuleConstant(): void {
  console.log(
    "[observability] KNOWLEDGE_MODULE_OBSERVABILITY constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_OBSERVABILITY,
    "app/knowledge/observability",
    "unexpected module constant",
  );
}

function assertLoggerStoresEventsInOrderWithDefensiveCopies(): void {
  console.log(
    "[observability] InMemoryLogger stores events in order and returns defensive copies...",
  );
  const logger = new InMemoryLogger();
  const attrs = { requestId: "r1", ok: true as const, count: 1 as const };
  logger.log({ level: "info", message: "first", attributes: attrs });
  logger.log({ level: "error", message: "second", attributes: { code: 500 } });

  const events = logger.getEvents();
  assertEqual(events.length, 2, "event count");
  assertEqual(events[0]!.message, "first", "first message");
  assertEqual(events[1]!.level, "error", "second level");

  (events[0]!.attributes as Record<string, unknown>).requestId = "mutated";
  assertEqual(
    logger.getEvents()[0]!.attributes.requestId,
    "r1",
    "getEvents defensive copy",
  );

  attrs.requestId = "mutated-input";
  assertEqual(
    logger.getEvents()[0]!.attributes.requestId,
    "r1",
    "log stores attribute copy",
  );

  logger.clear();
  assertEqual(logger.getEvents().length, 0, "clear empties events");
}

function assertMetricsAccumulatesAndSorts(): void {
  console.log(
    "[observability] InMemoryMetrics accumulates by signature and sorts getPoints...",
  );
  const metrics = new InMemoryMetrics();
  metrics.increment("http.requests", { method: "POST", path: "/b" });
  metrics.increment("http.requests", { path: "/a", method: "GET" });
  metrics.increment("http.requests", { method: "POST", path: "/b" });
  metrics.increment("agent.runs");
  metrics.increment("agent.runs");

  const points = metrics.getPoints();
  assertEqual(points.length, 3, "unique signatures");
  assertEqual(points[0]!.name, "agent.runs", "name ascending first");
  assertEqual(points[0]!.value, 2, "agent.runs accumulated");
  assertEqual(points[1]!.name, "http.requests", "http after agent");
  assertEqual(points[1]!.attributes.method, "GET", "signature ascending /a");
  assertEqual(points[1]!.value, 1, "GET count");
  assertEqual(points[2]!.attributes.path, "/b", "POST /b second");
  assertEqual(points[2]!.value, 2, "POST /b accumulated");

  (points[0]!.attributes as Record<string, string>).x = "y";
  assertTruthy(
    metrics.getPoints()[0]!.attributes.x === undefined,
    "getPoints defensive copy",
  );
}

function assertPortsAreCallable(): void {
  console.log("[observability] Logger and Metrics ports are callable...");
  const logger: Logger = new InMemoryLogger();
  const metrics: Metrics = new InMemoryMetrics();
  logger.log({ level: "debug", message: "ping", attributes: {} });
  metrics.increment("ping");
  assertEqual((logger as InMemoryLogger).getEvents().length, 1, "logger port");
  assertEqual(metrics.getPoints()[0]!.value, 1, "metrics port");
}

function main(): void {
  assertModuleConstant();
  assertLoggerStoresEventsInOrderWithDefensiveCopies();
  assertMetricsAccumulatesAndSorts();
  assertPortsAreCallable();
  console.log("Observability contract validation succeeded.");
}

main();
