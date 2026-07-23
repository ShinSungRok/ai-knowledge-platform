/**
 * Dependency-free Postgres SoT + OpenSearch VectorIndex listen smoke.
 * FakePostgresPool + FakeOpenSearchHttpTransport. Included in `pnpm validate`.
 */
import { FakePostgresPool } from "../infra/FakePostgresPool";
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
    pool: new FakePostgresPool(),
    applySchema: true,
    openSearch: createFakeOpenSearchOption({
      baseUrl: "http://opensearch.test",
      indexName: "knowledge-embeddings-pg-smoke",
    }),
  });
  assertEqual(
    composition.sqlGateway.constructor.name,
    "PostgresSqlGateway",
    "Postgres SoT",
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
    console.log("[start-postgres-opensearch-smoke] seed...");
    await seedDemoKnowledge(composition, workspaceId);

    console.log("[start-postgres-opensearch-smoke] start ephemeral...");
    const address = await server.start();
    const base = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health");

    const unauthorized = await fetch(
      `${base}/workspaces/${workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer");

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
    assertEqual(authorized.status, 200, "authorized");
    const body = (await authorized.json()) as {
      answer?: { insufficientEvidence?: boolean };
      citations?: unknown[];
    };
    assertEqual(body.answer?.insufficientEvidence, false, "grounded");
    assertTruthy(
      Array.isArray(body.citations) && body.citations.length > 0,
      "citations",
    );
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }

  console.log(
    "Postgres+OpenSearch listening start smoke validation succeeded.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
