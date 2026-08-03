/**
 * Dependency-free validation for WorkflowRunController + router path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { RunWorkflowUseCase } from "../application/RunWorkflowUseCase";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import { InMemoryWorkflowRunStore } from "../workflow/InMemoryWorkflowRunStore";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
import { WorkflowRunController } from "./WorkflowRunController";
import { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
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

class FakeWorkflowAgent implements WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;
  constructor(descriptor: WorkflowAgentDescriptor) {
    this.descriptor = descriptor;
  }
}

function agent(
  id: string,
  role: WorkflowAgentRole,
  displayName: string,
): WorkflowAgent {
  return new FakeWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
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

function buildOrchestrator(
  memory: InMemoryWorkflowMemoryStore = new InMemoryWorkflowMemoryStore(),
  fixedRunId: string = "run-http-fixed",
): WorkflowOrchestrator {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));
  return new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    new FakeWorkflowAgentInvoker(),
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId(fixedRunId),
  );
}

function bearerHeaders(
  token: string = TEST_API_KEY,
): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function main(): Promise<void> {
  console.log("[api] KNOWLEDGE_MODULE_API constant...");
  assertEqual(KNOWLEDGE_MODULE_API, "app/knowledge/api", "module constant");

  const { bearerGuard, workspaceAuthorizer } = buildAuth();
  const orchestrator = buildOrchestrator();
  const controller = new WorkflowRunController(
    new RunWorkflowUseCase(orchestrator),
    bearerGuard,
    workspaceAuthorizer,
  );

  console.log("[api] workflow-runs without Bearer → 401...");
  const unauthorized = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: {},
    body: { objective: "summarize policy" },
  });
  assertEqual(unauthorized.status, 401, "401");

  console.log("[api] workflow-runs wrong workspace → 403...");
  const forbidden = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: { objective: "summarize policy" },
  });
  assertEqual(forbidden.status, 403, "403");

  console.log("[api] workflow-runs missing objective → 400...");
  const badBody = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(badBody.status, 400, "400");

  console.log("[api] workflow-runs empty objective → 400...");
  const emptyObjective = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "   " },
  });
  assertEqual(emptyObjective.status, 400, "empty objective");

  console.log("[api] workflow-runs with Bearer → 200 completed...");
  const ok = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "summarize policy" },
  });
  assertEqual(ok.status, 200, "200");
  const body = ok.body as {
    status?: string;
    workflowRunId?: string;
    stepResults?: unknown[];
  };
  assertEqual(body.status, "completed", "status completed");
  assertEqual(body.workflowRunId, "run-http-fixed", "run id");
  assertTruthy(
    Array.isArray(body.stepResults) && body.stepResults.length === 3,
    "three steps",
  );

  console.log("[api] workflow-runs metadata.workflow.skipRoles reaches the orchestrator over HTTP...");
  const skipResponse = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: {
      objective: "summarize policy",
      metadata: { "workflow.skipRoles": "critic" },
    },
  });
  assertEqual(skipResponse.status, 200, "skip 200");
  const skipBody = skipResponse.body as {
    status?: string;
    stepResults?: readonly { role?: string; status?: string }[];
  };
  assertEqual(skipBody.status, "partial", "skip run status partial");
  const criticStep = skipBody.stepResults?.find((s) => s.role === "critic");
  assertEqual(criticStep?.status, "skipped", "critic step skipped");

  console.log("[api] workflow-runs metadata not a plain object → 400...");
  const badMetadataType = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "summarize policy", metadata: ["not", "an", "object"] },
  });
  assertEqual(badMetadataType.status, 400, "metadata not object → 400");

  console.log("[api] workflow-runs metadata value not a string → 400...");
  const badMetadataValue = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: {
      objective: "summarize policy",
      metadata: { "workflow.skipRoles": 123 },
    },
  });
  assertEqual(badMetadataValue.status, 400, "metadata value not string → 400");

  console.log("[api] createKnowledgeHttpRouter wires workflow-runs when orchestrator set...");
  const composition = createInMemoryKnowledgeComposition();
  const router = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { workflowOrchestrator: orchestrator },
  );
  const routed = await router.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "via router" },
  });
  assertEqual(routed.status, 200, "router 200");

  console.log("[api] without orchestrator, workflow-runs is not registered...");
  const routerNoWf = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
  );
  const missing = await routerNoWf.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "x" },
  });
  assertEqual(missing.status, 404, "404 without orchestrator");

  console.log("[api] GET workflow-runs/:id 404 when runStore not wired (3-arg controller)...");
  const noStoreGetById = await controller.getById({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-fixed`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(noStoreGetById.status, 404, "404 without runStore wired");

  console.log("[api] GET workflow-runs/:id/memory 404 when memoryStore not wired (3-arg controller)...");
  const noStoreGetMemory = await controller.getMemory({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-fixed/memory`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(noStoreGetMemory.status, 404, "404 without memoryStore wired");

  console.log("[api] POST + GET workflow-runs/:id + GET .../memory with stores wired...");
  const memoryWithStores = new InMemoryWorkflowMemoryStore();
  const runStore = new InMemoryWorkflowRunStore();
  const orchestratorWithStores = buildOrchestrator(memoryWithStores, "run-http-get-1");
  const controllerWithStores = new WorkflowRunController(
    new RunWorkflowUseCase(orchestratorWithStores, runStore),
    bearerGuard,
    workspaceAuthorizer,
    runStore,
    memoryWithStores,
  );
  const posted = await controllerWithStores.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs`,
    headers: bearerHeaders(),
    body: { objective: "summarize policy" },
  });
  assertEqual(posted.status, 200, "post 200");
  const postedBody = posted.body as { workflowRunId?: string };
  assertEqual(postedBody.workflowRunId, "run-http-get-1", "posted run id");

  console.log("[api] GET workflow-runs/:id without Bearer → 401...");
  const getByIdUnauthorized = await controllerWithStores.getById({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1`,
    headers: {},
    body: null,
  });
  assertEqual(getByIdUnauthorized.status, 401, "getById 401");

  console.log("[api] GET workflow-runs/:id wrong workspace → 403...");
  const getByIdForbidden = await controllerWithStores.getById({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: null,
  });
  assertEqual(getByIdForbidden.status, 403, "getById 403");

  console.log("[api] GET workflow-runs/:id unknown id → 404...");
  const getByIdMissing = await controllerWithStores.getById({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/does-not-exist`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(getByIdMissing.status, 404, "getById 404 unknown id");

  console.log("[api] GET workflow-runs/:id known id → 200 matching the POST response...");
  const getByIdOk = await controllerWithStores.getById({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(getByIdOk.status, 200, "getById 200");
  const getByIdBody = getByIdOk.body as {
    status?: string;
    workflowRunId?: string;
    stepResults?: unknown[];
  };
  const postedStatus = (posted.body as { status?: string }).status;
  assertEqual(getByIdBody.status, postedStatus, "getById status matches POST");
  assertEqual(getByIdBody.workflowRunId, "run-http-get-1", "getById run id matches POST");

  console.log("[api] GET workflow-runs/:id/memory without Bearer → 401...");
  const getMemoryUnauthorized = await controllerWithStores.getMemory({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1/memory`,
    headers: {},
    body: null,
  });
  assertEqual(getMemoryUnauthorized.status, 401, "getMemory 401");

  console.log("[api] GET workflow-runs/:id/memory wrong workspace → 403...");
  const getMemoryForbidden = await controllerWithStores.getMemory({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1/memory`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: null,
  });
  assertEqual(getMemoryForbidden.status, 403, "getMemory 403");

  console.log("[api] GET workflow-runs/:id/memory known id → 200 with non-empty entries...");
  const getMemoryOk = await controllerWithStores.getMemory({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1/memory`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(getMemoryOk.status, 200, "getMemory 200");
  const getMemoryBody = getMemoryOk.body as {
    workflowRunId?: string;
    entries?: readonly { kind?: string }[];
  };
  assertEqual(getMemoryBody.workflowRunId, "run-http-get-1", "memory response run id");
  assertTruthy(
    Array.isArray(getMemoryBody.entries) && getMemoryBody.entries.length > 0,
    "expected non-empty memory entries",
  );
  assertTruthy(
    getMemoryBody.entries!.some((entry) => entry.kind === "objective"),
    "expected an objective memory entry",
  );

  console.log("[api] router wires GET workflow-runs/:id + memory when stores are set...");
  const routerWithStores = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    {
      workflowOrchestrator: orchestratorWithStores,
      workflowRunStore: runStore,
      workflowMemoryStore: memoryWithStores,
    },
  );
  const routedGetById = await routerWithStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedGetById.status, 200, "router getById 200");
  const routedGetMemory = await routerWithStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1/memory`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedGetMemory.status, 200, "router getMemory 200");

  console.log("[api] router still 404s GET workflow-runs/:id when stores are not set, even with orchestrator...");
  const routerNoStores = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { workflowOrchestrator: orchestratorWithStores },
  );
  const routedNoStoreGetById = await routerNoStores.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-runs/run-http-get-1`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routedNoStoreGetById.status, 404, "router 404 without stores wired");

  console.log("[api] WorkflowRunController depends on use case + auth ports...");
  const source = readFileSync(
    path.join(
      process.cwd(),
      "app/knowledge/api/WorkflowRunController.ts",
    ),
    "utf8",
  );
  assertTruthy(
    !source.includes("FakeWorkflowAgentInvoker"),
    "no Fake invoker import",
  );
  assertTruthy(
    !source.includes("DefaultWorkflowOrchestrator"),
    "no Default orchestrator import",
  );
  assertTruthy(
    !source.includes("InMemoryWorkflowRunStore"),
    "no InMemory run store import (ports only)",
  );
  assertTruthy(
    !source.includes("InMemoryWorkflowMemoryStore"),
    "no InMemory memory store import (ports only)",
  );

  console.log("WorkflowRunController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
