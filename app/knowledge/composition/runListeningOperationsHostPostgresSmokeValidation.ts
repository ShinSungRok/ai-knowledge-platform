/**
 * Dependency-free Postgres listen smoke (FakePostgresPool).
 * Included in top-level `pnpm validate`.
 */
import { FakePostgresPool } from "../infra/FakePostgresPool";
import { createListeningOperationsServerFromComposition } from "./createListeningOperationsServerFromComposition";
import { createPostgresKnowledgeComposition } from "./createPostgresKnowledgeComposition";
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
  const workspaceId = "workspace-a";
  const apiKey = "demo-key";
  const composition = await createPostgresKnowledgeComposition({
    pool: new FakePostgresPool(),
    applySchema: true,
  });
  const server = createListeningOperationsServerFromComposition({
    composition,
    listen: { host: "127.0.0.1", port: 0 },
    apiKeys: {
      [apiKey]: { subject: "demo-user", workspaceId },
    },
  });

  try {
    console.log("[start-postgres-smoke] seed demo knowledge...");
    await seedDemoKnowledge(composition, workspaceId);

    console.log("[start-postgres-smoke] start ephemeral listener...");
    const address = await server.start();
    assertTruthy(address.port > 0, "ephemeral port");
    const base = `http://127.0.0.1:${address.port}`;

    console.log("[start-postgres-smoke] GET /health...");
    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health status");
    const healthBody = (await health.json()) as { status?: string };
    assertEqual(healthBody.status, "ok", "health body");

    console.log("[start-postgres-smoke] cited-answers without Bearer → 401...");
    const unauthorized = await fetch(
      `${base}/workspaces/${workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer");

    console.log("[start-postgres-smoke] cited-answers with Bearer → 200...");
    const authorized = await fetch(
      `${base}/workspaces/${workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(authorized.status, 200, "authorized status");
    const body = (await authorized.json()) as {
      answer?: { insufficientEvidence?: boolean };
      citations?: unknown[];
    };
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

  console.log("Postgres listening start smoke validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
