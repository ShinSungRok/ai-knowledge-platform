/**
 * Optional live Postgres listen smoke. Skips (exit 0) when DATABASE_URL unset.
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
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    console.log(
      "[start-postgres-live] DATABASE_URL unset — skipping live Postgres host smoke.",
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
  assertEqual(hostEnv.storeMode, "postgres", "expected postgres store mode");

  const host = await createConfiguredListeningHost(hostEnv);
  try {
    console.log("[start-postgres-live] seed + start ephemeral host...");
    await seedDemoKnowledge(host.server.composition, host.workspaceId);
    const address = await host.server.start();
    const base = `http://127.0.0.1:${address.port}`;

    const health = await fetch(`${base}/health`);
    assertEqual(health.status, 200, "health");

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

  console.log("Postgres listening host live smoke succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
