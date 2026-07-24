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
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
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

function buildOrchestrator(): WorkflowOrchestrator {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));
  return new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    new FakeWorkflowAgentInvoker(),
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
    () => asWorkflowRunId("run-http-fixed"),
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

  console.log("WorkflowRunController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
