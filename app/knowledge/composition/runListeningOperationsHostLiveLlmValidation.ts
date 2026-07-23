/**
 * Optional live HTTP LLM smoke for P2 Service Completion Phase B host.
 * Skips (exit 0) when LLM_API_KEY is unset. Not in top-level `pnpm validate`.
 *
 * Env:
 * - `LLM_API_KEY` (required for live run)
 * - `LLM_BASE_URL` (default `https://api.openai.com/v1`)
 * - `LLM_MODEL` (default `gpt-4o-mini`)
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
  const apiKey = process.env["LLM_API_KEY"];
  if (apiKey === undefined || apiKey.trim().length === 0) {
    console.log(
      "[start-llm-live] LLM_API_KEY unset — skipping live host LLM smoke.",
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
  assertEqual(hostEnv.llmMode, "http", "expected HTTP LLM mode with key set");

  const server = createConfiguredListeningOperationsServer(hostEnv);
  try {
    console.log("[start-llm-live] seed + start ephemeral host (HTTP LLM)...");
    await seedDemoKnowledge(server.composition, hostEnv.workspaceId);
    const address = await server.start();
    const base = `http://127.0.0.1:${address.port}`;

    const response = await fetch(
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
    assertEqual(response.status, 200, "cited-answers status");
    const body = (await response.json()) as {
      answer?: { text?: string };
    };
    assertTruthy(
      typeof body.answer?.text === "string" &&
        body.answer.text.trim().length > 0,
      "non-empty answer text",
    );
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }

  console.log("Listening operations host live LLM smoke succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
