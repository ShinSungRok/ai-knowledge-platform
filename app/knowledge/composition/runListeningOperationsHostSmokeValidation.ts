/**
 * Dependency-free smoke for P2 Service Completion Phase A start path.
 * Uses ephemeral port + shared host config/seed (no long-lived process spawn).
 */
import {
  createConfiguredListeningOperationsServer,
  loadListeningOperationsHostEnv,
} from "./listeningOperationsHostConfig";
import { DEMO_QUERY, seedDemoKnowledge } from "./seedDemoKnowledge";

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message} (actual=${String(actual)}, expected=${String(expected)})`,
    );
  }
}

function assertTruthy(value: unknown, message: string): void {
  if (!value) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const hostEnv = loadListeningOperationsHostEnv({
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "0",
    API_KEY: "demo-key",
    API_KEY_SUBJECT: "demo-user",
    WORKSPACE_ID: "workspace-a",
    SKIP_DEMO_SEED: "0",
  });
  const server = createConfiguredListeningOperationsServer(hostEnv);

  try {
    console.log("[start-smoke] seed demo knowledge...");
    await seedDemoKnowledge(server.composition, hostEnv.workspaceId);

    console.log("[start-smoke] start ephemeral listener...");
    const address = await server.start();
    assertEqual(address.host, "127.0.0.1", "host");
    assertTruthy(address.port > 0, "ephemeral port");

    const base = `http://127.0.0.1:${address.port}`;

    console.log("[start-smoke] GET /health...");
    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health status");
    const healthBody = (await health.json()) as { status?: string };
    assertEqual(healthBody.status, "ok", "health body");

    console.log("[start-smoke] cited-answers without Bearer → 401...");
    const unauthorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer");

    console.log("[start-smoke] cited-answers with Bearer → 200...");
    const authorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${hostEnv.apiKey}`,
        },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(authorized.status, 200, "authorized status");
    const body = (await authorized.json()) as {
      workspaceId?: string;
      answer?: { insufficientEvidence?: boolean; text?: string };
      citations?: unknown[];
    };
    assertEqual(body.workspaceId, hostEnv.workspaceId, "workspaceId");
    assertTruthy(typeof body.answer?.text === "string", "answer.text");
    assertEqual(body.answer?.insufficientEvidence, false, "grounded path");
    assertTruthy(
      Array.isArray(body.citations) && body.citations.length > 0,
      "citations present",
    );
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }

  console.log("Listening operations host start smoke validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
