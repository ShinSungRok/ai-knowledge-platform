import { KNOWLEDGE_MODULE_WORKFLOW, WORKFLOW_AGENT_ROLES } from "./index";
import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";
import { asWorkflowAgentId } from "./WorkflowAgentId";
import type {
  WorkflowAgent as TopLevelWorkflowAgent,
  WorkflowAgentRole as TopLevelWorkflowAgentRole,
} from "../index";

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

/**
 * In-file Fake for Role Contract validation — identity only, no run API.
 */
class FakeWorkflowAgent implements WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;

  constructor(descriptor: WorkflowAgentDescriptor) {
    this.descriptor = descriptor;
  }
}

function assertModuleConstant(): void {
  console.log(
    "[workflow] KNOWLEDGE_MODULE_WORKFLOW constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_WORKFLOW,
    "app/knowledge/workflow",
    "unexpected KNOWLEDGE_MODULE_WORKFLOW value",
  );
}

function assertRoleUnionSanity(): void {
  console.log("[workflow] WorkflowAgentRole union and WORKFLOW_AGENT_ROLES...");
  const expected: readonly WorkflowAgentRole[] = [
    "coordinator",
    "researcher",
    "synthesizer",
    "critic",
    "executor",
  ];
  assertEqual(
    WORKFLOW_AGENT_ROLES.length,
    expected.length,
    "unexpected WORKFLOW_AGENT_ROLES length",
  );
  for (const role of expected) {
    assertTruthy(
      WORKFLOW_AGENT_ROLES.includes(role),
      `expected WORKFLOW_AGENT_ROLES to include ${role}`,
    );
  }
  // Project 2 single-agent roles must not appear on the Multi-Agent union.
  for (const singleAgentRole of ["planner", "reviewer"] as const) {
    assertTruthy(
      !(WORKFLOW_AGENT_ROLES as readonly string[]).includes(singleAgentRole),
      `WorkflowAgentRole must not include single-agent role ${singleAgentRole}`,
    );
  }
}

function assertFakeWorkflowAgentAssignability(): void {
  console.log("[workflow] FakeWorkflowAgent satisfies WorkflowAgent port...");
  const agent: WorkflowAgent = new FakeWorkflowAgent({
    id: asWorkflowAgentId("agent-researcher-1"),
    role: "researcher",
    displayName: "Researcher One",
    capabilities: ["search", "summarize"],
  });
  assertEqual(agent.descriptor.id, "agent-researcher-1", "descriptor.id");
  assertEqual(agent.descriptor.role, "researcher", "descriptor.role");
  assertEqual(
    agent.descriptor.displayName,
    "Researcher One",
    "descriptor.displayName",
  );
  assertEqual(
    agent.descriptor.capabilities?.length,
    2,
    "descriptor.capabilities length",
  );
}

function assertTopLevelBarrelExports(): void {
  console.log(
    "[workflow] top-level barrel re-exports WorkflowAgent contract types...",
  );
  const agentAssignable: WorkflowAgent | null =
    null as TopLevelWorkflowAgent | null;
  const roleAssignable: WorkflowAgentRole | null =
    null as TopLevelWorkflowAgentRole | null;
  assertTruthy(
    agentAssignable === null && roleAssignable === null,
    "expected module and top-level WorkflowAgent types to be assignable",
  );
}

function main(): void {
  assertModuleConstant();
  assertRoleUnionSanity();
  assertFakeWorkflowAgentAssignability();
  assertTopLevelBarrelExports();
  console.log("Workflow agent contract validation succeeded.");
}

main();
