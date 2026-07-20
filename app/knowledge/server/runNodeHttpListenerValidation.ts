import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import { HealthController } from "../api/HealthController";
import { NodeHttpListener } from "./NodeHttpListener";

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

function buildHealthRouter(): DefaultHttpRouter {
  const health = new HealthController();
  return new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: (request) => health.check(request),
    },
  ]);
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = undefined;
  if (text.length > 0) {
    body = JSON.parse(text);
  }
  return { status: response.status, body };
}

async function assertHealthAndErrors(): Promise<void> {
  console.log(
    "[server] NodeHttpListener ephemeral /health + 404/405 on 127.0.0.1...",
  );
  const listener = new NodeHttpListener(buildHealthRouter());
  try {
    const address = await listener.listen({ host: "127.0.0.1", port: 0 });
    assertEqual(address.host, "127.0.0.1", "host");
    assertTruthy(address.port > 0, "bound port > 0");
    assertTruthy(listener.isListening(), "isListening");

    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetchJson(`${base}/health`);
    assertEqual(health.status, 200, "health status");
    assertEqual(
      (health.body as { status?: string }).status,
      "ok",
      "health body",
    );

    const missing = await fetchJson(`${base}/missing`);
    assertEqual(missing.status, 404, "404 Not Found");

    const methodNotAllowed = await fetchJson(`${base}/health`, {
      method: "PUT",
    });
    assertEqual(methodNotAllowed.status, 405, "405 Method Not Allowed");

    await listener.close();
    assertEqual(listener.isListening(), false, "after close");

    let failed = false;
    try {
      await fetchJson(`${base}/health`);
    } catch {
      failed = true;
    }
    assertTruthy(failed, "request after close must fail");
  } finally {
    if (listener.isListening()) {
      await listener.close();
    }
  }
}

async function main(): Promise<void> {
  await assertHealthAndErrors();
  console.log("NodeHttpListener validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
