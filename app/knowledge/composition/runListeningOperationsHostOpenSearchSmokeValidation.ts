/**
 * Dependency-free OpenSearch listen smoke (FakeOpenSearchHttpTransport).
 * InMemorySql SoT + OpenSearch VectorIndex. Included in top-level `pnpm validate`.
 */
import { createListeningOperationsServerFromComposition } from "./createListeningOperationsServerFromComposition";
import { createOpenSearchKnowledgeComposition } from "./createOpenSearchKnowledgeComposition";
import { createFakeOpenSearchOption } from "./createOpenSearchVectorIndexFromEnv";
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
  const composition = await createOpenSearchKnowledgeComposition(undefined, {
    openSearch: createFakeOpenSearchOption(),
  });
  assertEqual(
    composition.sqlGateway.constructor.name,
    "InMemorySqlGateway",
    "InMemorySql SoT",
  );
  assertEqual(
    composition.vectorIndex.constructor.name,
    "OpenSearchVectorIndex",
    "OpenSearch vector",
  );

  const server = createListeningOperationsServerFromComposition({
    composition,
    listen: { host: "127.0.0.1", port: 0 },
    apiKeys: {
      [apiKey]: { subject: "demo-user", workspaceId },
    },
  });

  try {
    console.log("[start-opensearch-smoke] seed demo knowledge...");
    await seedDemoKnowledge(composition, workspaceId);

    console.log("[start-opensearch-smoke] start ephemeral listener...");
    const address = await server.start();
    assertTruthy(address.port > 0, "ephemeral port");
    const base = `http://127.0.0.1:${address.port}`;

    console.log("[start-opensearch-smoke] GET /health...");
    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health status");
    const healthBody = (await health.json()) as { status?: string };
    assertEqual(healthBody.status, "ok", "health body");

    console.log("[start-opensearch-smoke] cited-answers without Bearer → 401...");
    const unauthorized = await fetch(
      `${base}/workspaces/${workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer");

    console.log("[start-opensearch-smoke] cited-answers with Bearer → 200...");
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

  console.log("OpenSearch listening start smoke validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
