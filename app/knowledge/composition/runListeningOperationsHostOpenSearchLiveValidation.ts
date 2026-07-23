/**
 * Optional live OpenSearch listen smoke. Skips (exit 0) when OPENSEARCH_URL unset.
 * Prefers postgres+opensearch when DATABASE_URL is also set.
 * Not included in top-level `pnpm validate`.
 */
import {
  createConfiguredListeningHost,
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
  const openSearchUrl = process.env["OPENSEARCH_URL"];
  if (openSearchUrl === undefined || openSearchUrl.trim().length === 0) {
    console.log(
      "[start-opensearch-live] OPENSEARCH_URL unset — skipping live OpenSearch host smoke.",
    );
    return;
  }

  const hostEnv = loadListeningOperationsHostEnv({
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "0",
    API_KEY: process.env["API_KEY"]?.trim() || "demo-key",
    API_KEY_SUBJECT: "demo-user",
    WORKSPACE_ID: "workspace-a",
    SKIP_DEMO_SEED: "0",
  });
  assertEqual(hostEnv.vectorMode, "opensearch", "vector mode");
  assertTruthy(
    hostEnv.storeMode === "opensearch" ||
      hostEnv.storeMode === "postgres+opensearch",
    `expected opensearch store mode (got ${hostEnv.storeMode})`,
  );

  const host = await createConfiguredListeningHost(hostEnv);
  try {
    console.log(
      `[start-opensearch-live] STORE=${host.storeMode} VECTOR=${host.vectorMode}; seed + start...`,
    );
    await seedDemoKnowledge(host.server.composition, host.workspaceId);
    const address = await host.server.start();
    const base = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health");

    const unauthorized = await fetch(
      `${base}/workspaces/${host.workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer");

    const authorized = await fetch(
      `${base}/workspaces/${host.workspaceId}/cited-answers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${hostEnv.apiKey}`,
        },
        body: JSON.stringify({ query: DEMO_QUERY }),
      },
    );
    assertEqual(authorized.status, 200, "cited-answers");
    const body = (await authorized.json()) as {
      answer?: { text?: string };
    };
    assertTruthy(
      typeof body.answer?.text === "string" &&
        body.answer.text.trim().length > 0,
      "non-empty answer",
    );
  } finally {
    if (host.server.listener.isListening()) {
      await host.server.stop();
    }
    await host.dispose();
  }

  console.log("OpenSearch listening host live smoke succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
