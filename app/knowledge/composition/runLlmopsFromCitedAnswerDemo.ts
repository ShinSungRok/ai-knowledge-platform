/**
 * P4 B-path helper: call live cited-answers, measure wall latency, then
 * POST llmops/control-plane with those metrics + model labels.
 *
 * Requires a running `pnpm start` host (does not start one).
 *
 *   pnpm demo:llmops:from-cited-answer
 *
 * Env:
 *   BASE_URL (default http://127.0.0.1:8080)
 *   API_KEY (default demo-key)
 *   WORKSPACE_ID (default workspace-a)
 *   QUERY (default: MFA VPN question matching demo seed)
 *   LLM_MODEL (optional; sent as servingLabels)
 */
async function postJson(
  url: string,
  apiKey: string,
  body: unknown,
): Promise<{ status: number; json: unknown; latencyMs: number }> {
  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - started;
  const text = await response.text();
  let json: unknown = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { raw: text };
    }
  }
  return { status: response.status, json, latencyMs };
}

function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value !== undefined && value.length > 0 ? value : fallback;
}

function softQuality(insufficientEvidence: boolean): {
  hitRateAtK: number;
  meanReciprocalRank: number;
} {
  if (insufficientEvidence) {
    return { hitRateAtK: 0.55, meanReciprocalRank: 0.4 };
  }
  return { hitRateAtK: 0.92, meanReciprocalRank: 0.81 };
}

async function main(): Promise<void> {
  const baseUrl = envOr("BASE_URL", "http://127.0.0.1:8080").replace(/\/$/, "");
  const apiKey = envOr("API_KEY", "demo-key");
  const workspaceId = envOr("WORKSPACE_ID", "workspace-a");
  const query = envOr("QUERY", "Is MFA required for VPN?");
  const model = process.env["LLM_MODEL"]?.trim();

  console.log("=== P4 LLMOps from cited-answer (live metrics helper) ===");
  console.log(`baseUrl=${baseUrl}  workspace=${workspaceId}`);
  console.log(`query=${query}`);

  const citedUrl = `${baseUrl}/workspaces/${workspaceId}/cited-answers`;
  console.log("\n--- 1) POST cited-answers (measure latency) ---");
  const cited = await postJson(citedUrl, apiKey, { query });
  if (cited.status !== 200) {
    console.error("cited-answers failed", cited.status, cited.json);
    process.exitCode = 1;
    return;
  }

  const answer = cited.json as {
    answer?: { insufficientEvidence?: boolean; text?: string };
    citations?: unknown[];
  };
  const insufficient = answer.answer?.insufficientEvidence === true;
  const citationCount = Array.isArray(answer.citations)
    ? answer.citations.length
    : 0;
  const quality = softQuality(insufficient);
  const metrics = {
    ...quality,
    latencyMs: cited.latencyMs,
    citationCount,
  };

  console.log(`HTTP ${cited.status}  wallLatencyMs=${cited.latencyMs}`);
  console.log(
    `insufficientEvidence=${insufficient}  citations=${citationCount}`,
  );
  console.log(`soft metrics → ${JSON.stringify(metrics)}`);
  if (typeof answer.answer?.text === "string") {
    const preview = answer.answer.text.slice(0, 160);
    console.log(`answer preview: ${preview}${answer.answer.text.length > 160 ? "…" : ""}`);
  }

  const controlUrl = `${baseUrl}/workspaces/${workspaceId}/llmops/control-plane`;
  const controlBody: Record<string, unknown> = { metrics };
  if (model !== undefined && model.length > 0) {
    controlBody.servingLabels = {
      modelName: model,
      providerModel: model,
    };
  }

  console.log("\n--- 2) POST llmops/control-plane (inject metrics) ---");
  const control = await postJson(controlUrl, apiKey, controlBody);
  if (control.status !== 200) {
    console.error("control-plane failed", control.status, control.json);
    process.exitCode = 1;
    return;
  }

  const view = control.json as {
    modelName?: string;
    providerModel?: string;
    gatePassed?: boolean;
    regressionPassed?: boolean;
    servingStatus?: string;
    observationId?: string;
    metrics?: Record<string, number>;
  };
  console.log(`HTTP ${control.status}`);
  console.log(
    `modelName=${view.modelName}  providerModel=${view.providerModel}`,
  );
  console.log(
    `gatePassed=${view.gatePassed}  regressionPassed=${view.regressionPassed}  serving=${view.servingStatus}`,
  );
  console.log(`observationId=${view.observationId}`);
  console.log(`recorded metrics=${JSON.stringify(view.metrics)}`);
  console.log(
    "\nNote: latencyMs is wall-clock from cited-answers; hitRate/MRR are soft proxies from grounded vs insufficient.",
  );
  console.log("P4 from-cited-answer helper complete.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
