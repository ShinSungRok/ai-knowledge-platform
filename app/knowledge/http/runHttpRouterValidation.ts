import { DefaultHttpRouter } from "./DefaultHttpRouter";
import type { HttpHandler } from "./HttpHandler";
import type { HttpRequest } from "./HttpRequest";
import type { HttpResponse } from "./HttpResponse";
import { KNOWLEDGE_MODULE_HTTP } from "./index";

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
  console.log("[http] KNOWLEDGE_MODULE_HTTP constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_HTTP, "app/knowledge/http", "unexpected module constant");
}

async function assertExactMatchDispatch(): Promise<void> {
  console.log("[http] DefaultHttpRouter dispatches exact method+path matches...");
  const calls: string[] = [];
  const handler: HttpHandler = async (request) => {
    calls.push(`${request.method} ${request.path}`);
    return {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true },
    };
  };
  const router = new DefaultHttpRouter([
    { method: "GET", path: "/health", handler },
    { method: "POST", path: "/echo", handler },
  ]);

  const health = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(health.status, 200, "health status");
  assertEqual(calls.join("|"), "GET /health", "health handler called");

  const echo = await router.handle({
    method: "POST",
    path: "/echo",
    headers: {},
    body: { a: 1 },
  });
  assertEqual(echo.status, 200, "echo status");
  assertEqual(calls.join("|"), "GET /health|POST /echo", "both handlers");
}

async function assertNotFound(): Promise<void> {
  console.log("[http] DefaultHttpRouter returns JSON 404 for unknown routes...");
  const router = new DefaultHttpRouter([]);
  const response: HttpResponse = await router.handle({
    method: "GET",
    path: "/missing",
    headers: {},
  } satisfies HttpRequest);
  assertEqual(response.status, 404, "status");
  assertEqual(
    (response.body as { error: string }).error,
    "Not Found",
    "error body",
  );
  assertEqual(
    response.headers["content-type"],
    "application/json",
    "content-type",
  );
}

async function assertMethodPathExactness(): Promise<void> {
  console.log(
    "[http] DefaultHttpRouter does not match wrong method or wrong path...",
  );
  let called = false;
  const router = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => {
        called = true;
        return { status: 200, headers: {}, body: {} };
      },
    },
  ]);
  const wrongMethod = await router.handle({
    method: "POST",
    path: "/health",
    headers: {},
  });
  assertEqual(wrongMethod.status, 404, "wrong method → 404");
  assertTruthy(!called, "handler must not run for wrong method");

  const wrongPath = await router.handle({
    method: "GET",
    path: "/healthz",
    headers: {},
  });
  assertEqual(wrongPath.status, 404, "wrong path → 404");
  assertTruthy(!called, "handler must not run for wrong path");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertExactMatchDispatch();
  await assertNotFound();
  await assertMethodPathExactness();
  console.log("HttpRouter validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
