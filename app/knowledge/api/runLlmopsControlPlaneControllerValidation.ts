/**
 * Dependency-free validation for LlmopsControlPlaneController + router path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
import { InMemoryEvaluationGateDefinitionStore } from "../llmops/InMemoryEvaluationGateDefinitionStore";
import { InMemoryExperimentRunStore } from "../llmops/InMemoryExperimentRunStore";
import { InMemoryLlmopsObservationStore } from "../llmops/InMemoryLlmopsObservationStore";
import { InMemoryModelRegistry } from "../llmops/InMemoryModelRegistry";
import { InMemoryPromptRegistry } from "../llmops/InMemoryPromptRegistry";
import { InMemoryServingConfigStore } from "../llmops/InMemoryServingConfigStore";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
import { LlmopsControlPlaneController } from "./LlmopsControlPlaneController";
import { KNOWLEDGE_MODULE_API } from "./index";

const WORKSPACE_A = "workspace-a";
const TEST_API_KEY = "test-api-key";
const OTHER_WORKSPACE_KEY = "other-workspace-key";

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

function buildAuth(): {
  bearerGuard: HttpBearerGuard;
  workspaceAuthorizer: WorkspaceAuthorizer;
} {
  const authenticator = new ApiKeyAuthenticator({
    [TEST_API_KEY]: { subject: "test-user", workspaceId: WORKSPACE_A },
    [OTHER_WORKSPACE_KEY]: {
      subject: "other-user",
      workspaceId: "other-workspace",
    },
  });
  return {
    bearerGuard: new HttpBearerGuard(authenticator),
    workspaceAuthorizer: new DefaultWorkspaceAuthorizer(),
  };
}

function bearerHeaders(token: string = TEST_API_KEY): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function main(): Promise<void> {
  console.log("[api] KNOWLEDGE_MODULE_API constant...");
  assertEqual(KNOWLEDGE_MODULE_API, "app/knowledge/api", "module constant");

  const { bearerGuard, workspaceAuthorizer } = buildAuth();
  const useCase = new RunLlmopsControlPlaneUseCase();
  const controller = new LlmopsControlPlaneController(
    useCase,
    bearerGuard,
    workspaceAuthorizer,
  );

  console.log("[api] llmops/control-plane without Bearer → 401...");
  const unauthorized = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: {},
    body: {},
  });
  assertEqual(unauthorized.status, 401, "401");

  console.log("[api] llmops/control-plane wrong workspace → 403...");
  const forbidden = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: {},
  });
  assertEqual(forbidden.status, 403, "403");

  console.log("[api] llmops/control-plane empty body → 200 passed...");
  const ok = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(ok.status, 200, "200");
  const body = ok.body as {
    gatePassed?: boolean;
    regressionPassed?: boolean;
    servingStatus?: string;
    observationId?: string;
  };
  assertEqual(body.gatePassed, true, "gate");
  assertEqual(body.regressionPassed, true, "regression");
  assertEqual(body.servingStatus, "active", "serving");
  assertTruthy(
    typeof body.observationId === "string" && body.observationId.length > 0,
    "observationId",
  );

  console.log("[api] llmops/control-plane metrics + servingLabels → 200...");
  const labeled = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(),
    body: {
      metrics: { latencyMs: 640, hitRateAtK: 0.92, meanReciprocalRank: 0.81 },
      servingLabels: {
        modelName: "gemini-test",
        providerModel: "gemini-test",
      },
    },
  });
  assertEqual(labeled.status, 200, "labeled 200");
  const labeledBody = labeled.body as {
    modelName?: string;
    providerModel?: string;
    metrics?: { latencyMs?: number };
  };
  assertEqual(labeledBody.modelName, "gemini-test", "modelName");
  assertEqual(labeledBody.providerModel, "gemini-test", "providerModel");
  assertEqual(labeledBody.metrics?.latencyMs, 640, "latency override");

  console.log("[api] createKnowledgeHttpRouter wires llmops when use case set...");
  const composition = createInMemoryKnowledgeComposition();
  const router = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { runLlmopsControlPlane: useCase },
  );
  const routed = await router.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(routed.status, 200, "router 200");

  console.log("[api] without use case, llmops path is not registered...");
  const routerNo = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
  );
  const missing = await routerNo.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(missing.status, 404, "404");

  console.log("[api] GET routes 404 when their store isn't wired (3-arg controller)...");
  const noStorePrompts = await controller.listPrompts({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/prompts`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(noStorePrompts.status, 404, "404 without prompts store wired");

  console.log("[api] POST + GET across all 6 llmops read routes with stores wired...");
  const prompts = new InMemoryPromptRegistry();
  const models = new InMemoryModelRegistry();
  const runs = new InMemoryExperimentRunStore();
  const serving = new InMemoryServingConfigStore();
  const observations = new InMemoryLlmopsObservationStore();
  const gateDefinitions = new InMemoryEvaluationGateDefinitionStore();
  const useCaseWithStores = new RunLlmopsControlPlaneUseCase(
    {},
    { prompts, models, runs, serving, observations, gateDefinitions },
  );
  const controllerWithStores = new LlmopsControlPlaneController(
    useCaseWithStores,
    bearerGuard,
    workspaceAuthorizer,
    runs,
    prompts,
    models,
    gateDefinitions,
    serving,
    observations,
  );
  const posted = await controllerWithStores.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/llmops/control-plane`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(posted.status, 200, "posted 200");
  const postedBody = posted.body as {
    experimentRunId?: string;
    runStatus?: string;
  };

  console.log("[api] GET experiment-runs/:id without Bearer → 401...");
  const runUnauthorized = await controllerWithStores.getExperimentRun({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/experiment-runs/${postedBody.experimentRunId}`,
    headers: {},
    body: null,
  });
  assertEqual(runUnauthorized.status, 401, "getExperimentRun 401");

  console.log("[api] GET experiment-runs/:id wrong workspace → 403...");
  const runForbidden = await controllerWithStores.getExperimentRun({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/experiment-runs/${postedBody.experimentRunId}`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: null,
  });
  assertEqual(runForbidden.status, 403, "getExperimentRun 403");

  console.log("[api] GET experiment-runs/:id unknown id → 404...");
  const runMissing = await controllerWithStores.getExperimentRun({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/experiment-runs/does-not-exist`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(runMissing.status, 404, "getExperimentRun 404 unknown id");

  console.log("[api] GET experiment-runs/:id known id → 200 matching status...");
  const runOk = await controllerWithStores.getExperimentRun({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/experiment-runs/${postedBody.experimentRunId}`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(runOk.status, 200, "getExperimentRun 200");
  const runOkBody = runOk.body as { status?: string };
  assertEqual(runOkBody.status, postedBody.runStatus, "run status matches POST");

  console.log("[api] GET prompts / models / evaluation-gates / serving-configs / observations → 200...");
  const promptsOk = await controllerWithStores.listPrompts({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/prompts`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(promptsOk.status, 200, "listPrompts 200");
  assertEqual(
    (promptsOk.body as { templates?: unknown[] }).templates?.length,
    1,
    "one template",
  );

  const modelsOk = await controllerWithStores.listModels({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/models`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(modelsOk.status, 200, "listModels 200");
  assertEqual(
    (modelsOk.body as { models?: unknown[] }).models?.length,
    1,
    "one model",
  );

  const gatesOk = await controllerWithStores.listEvaluationGates({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/evaluation-gates`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(gatesOk.status, 200, "listEvaluationGates 200");
  assertEqual(
    (gatesOk.body as { gates?: { id?: string }[] }).gates?.[0]?.id,
    "gate-def-default",
    "default gate definition present",
  );

  const servingOk = await controllerWithStores.listServingConfigs({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/serving-configs`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(servingOk.status, 200, "listServingConfigs 200");
  assertEqual(
    (servingOk.body as { servingConfigs?: unknown[] }).servingConfigs?.length,
    1,
    "one serving config",
  );

  const observationsOk = await controllerWithStores.listObservations({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/observations`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(observationsOk.status, 200, "listObservations 200");
  assertEqual(
    (observationsOk.body as { observations?: unknown[] }).observations?.length,
    1,
    "one observation",
  );

  console.log("[api] router wires all 6 llmops GET routes when stores are set...");
  const routerWithStores = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    {
      runLlmopsControlPlane: useCaseWithStores,
      llmopsExperimentRunStore: runs,
      llmopsPromptRegistry: prompts,
      llmopsModelRegistry: models,
      llmopsGateDefinitionStore: gateDefinitions,
      llmopsServingConfigStore: serving,
      llmopsObservationStore: observations,
    },
  );
  const routedRun = await routerWithStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/experiment-runs/${postedBody.experimentRunId}`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedRun.status, 200, "router getExperimentRun 200");
  const routedPrompts = await routerWithStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/prompts`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedPrompts.status, 200, "router listPrompts 200");

  console.log("[api] router still 404s llmops/prompts when store not set, even with use case...");
  const routerNoStores = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { runLlmopsControlPlane: useCaseWithStores },
  );
  const routedNoStorePrompts = await routerNoStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/llmops/prompts`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedNoStorePrompts.status, 404, "router 404 without stores wired");

  console.log("[api] controller depends on use case + auth ports...");
  const source = readFileSync(
    path.join(
      process.cwd(),
      "app/knowledge/api/LlmopsControlPlaneController.ts",
    ),
    "utf8",
  );
  assertTruthy(
    !source.includes("InMemoryPromptRegistry"),
    "no InMemory registry in controller",
  );
  assertTruthy(
    !source.includes("InMemoryModelRegistry") &&
      !source.includes("InMemoryExperimentRunStore") &&
      !source.includes("InMemoryServingConfigStore") &&
      !source.includes("InMemoryLlmopsObservationStore") &&
      !source.includes("InMemoryEvaluationGateDefinitionStore"),
    "no other InMemory llmops adapters in controller (ports only)",
  );

  console.log("LlmopsControlPlaneController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
