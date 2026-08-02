/**
 * Dependency-free validation for WorkflowAgentController + router path.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
import { WorkflowAgentController } from "./WorkflowAgentController";
import { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";

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

function buildRegistry(): InMemoryWorkflowAgentRegistry {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));
  return registry;
}

function bearerHeaders(token: string = TEST_API_KEY): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function main(): Promise<void> {
  const { bearerGuard, workspaceAuthorizer } = buildAuth();
  const registry = buildRegistry();
  const controller = new WorkflowAgentController(
    registry,
    bearerGuard,
    workspaceAuthorizer,
  );

  console.log("[api] workflow-agents without Bearer → 401...");
  const unauthorized = await controller.list({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: {},
    body: null,
  });
  assertEqual(unauthorized.status, 401, "401");

  console.log("[api] workflow-agents wrong workspace → 403...");
  const forbidden = await controller.list({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: null,
  });
  assertEqual(forbidden.status, 403, "403");

  console.log("[api] workflow-agents wrong method → 405...");
  const wrongMethod = await controller.list({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(wrongMethod.status, 405, "405");

  console.log("[api] workflow-agents with Bearer → 200 with 3 registered agents...");
  const ok = await controller.list({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(ok.status, 200, "200");
  const body = ok.body as { agents?: readonly { id?: string; role?: string }[] };
  assertTruthy(Array.isArray(body.agents) && body.agents.length === 3, "3 agents");
  assertTruthy(
    body.agents!.some((a) => a.id === "agent-researcher" && a.role === "researcher"),
    "researcher present",
  );

  console.log("[api] workflow-agents same list from another authorized workspace (process-global registry)...");
  const authenticatorOtherAllowed = new ApiKeyAuthenticator({
    [TEST_API_KEY]: { subject: "test-user", workspaceId: WORKSPACE_A },
    [OTHER_WORKSPACE_KEY]: { subject: "other-user", workspaceId: "other-workspace" },
  });
  const otherWorkspaceGuard = new HttpBearerGuard(authenticatorOtherAllowed);
  const otherWorkspaceController = new WorkflowAgentController(
    registry,
    otherWorkspaceGuard,
    workspaceAuthorizer,
  );
  const otherOk = await otherWorkspaceController.list({
    method: "GET",
    path: `/workspaces/other-workspace/workflow-agents`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: null,
  });
  assertEqual(otherOk.status, 200, "other-workspace 200");
  const otherBody = otherOk.body as { agents?: readonly unknown[] };
  assertEqual(otherBody.agents?.length, 3, "same global 3 agents");

  console.log("[api] createKnowledgeHttpRouter wires workflow-agents when registry set...");
  const composition = createInMemoryKnowledgeComposition();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    new FakeWorkflowAgentInvoker(),
    new DefaultWorkflowHandoffBuilder(),
    new InMemoryWorkflowMemoryStore(),
  );
  const router = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { workflowOrchestrator: orchestrator, workflowAgentRegistry: registry },
  );
  const routed = await router.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(routed.status, 200, "router 200");

  console.log("[api] router still 404s workflow-agents when registry not set, even with orchestrator...");
  const routerNoRegistry = createKnowledgeHttpRouter(
    composition.runtime,
    bearerGuard,
    workspaceAuthorizer,
    composition.mcpJsonRpcHandler,
    { workflowOrchestrator: orchestrator },
  );
  const missing = await routerNoRegistry.handle({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/workflow-agents`,
    headers: bearerHeaders(),
    body: null,
  });
  assertEqual(missing.status, 404, "404 without registry wired");

  console.log("[api] WorkflowAgentController depends on registry port only...");
  const source = readFileSync(
    path.join(process.cwd(), "app/knowledge/api/WorkflowAgentController.ts"),
    "utf8",
  );
  assertTruthy(
    !source.includes("InMemoryWorkflowAgentRegistry"),
    "no InMemory registry import (ports only)",
  );

  console.log("WorkflowAgentController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
