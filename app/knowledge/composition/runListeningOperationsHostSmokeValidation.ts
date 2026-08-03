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

function assertLlmTemperatureDefaulting(): void {
  console.log("[start-smoke] LLM temperature defaulting...");

  const withoutKey = loadListeningOperationsHostEnv({ PORT: "0" });
  assertEqual(withoutKey.llmMode, "fake", "no LLM_API_KEY → fake mode");

  const withKeyNoOverride = loadListeningOperationsHostEnv({
    PORT: "0",
    LLM_API_KEY: "sk-test",
  });
  assertEqual(withKeyNoOverride.llmMode, "http", "LLM_API_KEY set → http mode");
  assertTruthy(withKeyNoOverride.llm?.type === "http", "http llm option");
  assertEqual(
    withKeyNoOverride.llm?.type === "http"
      ? withKeyNoOverride.llm.config.temperature
      : undefined,
    0,
    "defaults to temperature 0 for reproducibility",
  );

  const withOverride = loadListeningOperationsHostEnv({
    PORT: "0",
    LLM_API_KEY: "sk-test",
    LLM_TEMPERATURE: "0.7",
  });
  assertEqual(
    withOverride.llm?.type === "http"
      ? withOverride.llm.config.temperature
      : undefined,
    0.7,
    "LLM_TEMPERATURE overrides the default",
  );

  const withBogusOverride = loadListeningOperationsHostEnv({
    PORT: "0",
    LLM_API_KEY: "sk-test",
    LLM_TEMPERATURE: "not-a-number",
  });
  assertEqual(
    withBogusOverride.llm?.type === "http"
      ? withBogusOverride.llm.config.temperature
      : undefined,
    0,
    "malformed LLM_TEMPERATURE falls back to 0, not a crash",
  );
}

async function main(): Promise<void> {
  assertLlmTemperatureDefaulting();

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

    console.log("[start-smoke] workflow-runs without Bearer → 401...");
    const wfUnauthorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/workflow-runs`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objective: DEMO_QUERY }),
      },
    );
    assertEqual(wfUnauthorized.status, 401, "workflow missing bearer");

    console.log("[start-smoke] workflow-runs with Bearer → 200 completed...");
    const wfAuthorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/workflow-runs`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${hostEnv.apiKey}`,
        },
        body: JSON.stringify({ objective: DEMO_QUERY }),
      },
    );
    assertEqual(wfAuthorized.status, 200, "workflow authorized status");
    const wfBody = (await wfAuthorized.json()) as {
      status?: string;
      workflowRunId?: string;
      stepResults?: unknown[];
    };
    assertEqual(wfBody.status, "completed", "workflow status");
    assertTruthy(
      typeof wfBody.workflowRunId === "string" &&
        wfBody.workflowRunId.length > 0,
      "workflowRunId",
    );
    assertTruthy(
      Array.isArray(wfBody.stepResults) && wfBody.stepResults.length === 3,
      "three workflow steps",
    );

    console.log("[start-smoke] llmops/control-plane without Bearer → 401...");
    const llmUnauthorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/llmops/control-plane`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    assertEqual(llmUnauthorized.status, 401, "llmops missing bearer");

    console.log("[start-smoke] llmops/control-plane with Bearer → 200...");
    const llmAuthorized = await fetch(
      `${base}/workspaces/${hostEnv.workspaceId}/llmops/control-plane`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${hostEnv.apiKey}`,
        },
        body: JSON.stringify({}),
      },
    );
    assertEqual(llmAuthorized.status, 200, "llmops authorized status");
    const llmBody = (await llmAuthorized.json()) as {
      gatePassed?: boolean;
      regressionPassed?: boolean;
      servingStatus?: string;
      observationId?: string;
    };
    assertEqual(llmBody.gatePassed, true, "gatePassed");
    assertEqual(llmBody.regressionPassed, true, "regressionPassed");
    assertEqual(llmBody.servingStatus, "active", "servingStatus");
    assertTruthy(
      typeof llmBody.observationId === "string" &&
        llmBody.observationId.length > 0,
      "observationId",
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
