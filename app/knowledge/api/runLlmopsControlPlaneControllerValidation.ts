/**
 * Dependency-free validation for LlmopsControlPlaneController + router path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { RunLlmopsControlPlaneUseCase } from "../application/RunLlmopsControlPlaneUseCase";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
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

  console.log("LlmopsControlPlaneController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
