/**
 * P3 Multi-Agent Workflow Engine demo (portfolio / local console).
 *
 * Dependency-free: Fake invoker + InMemory registry/memory.
 * Shows Planner → Orchestrator → Handoff → Memory → Aggregation.
 *
 *   pnpm demo:workflow:engine
 */
import { asWorkflowAgentId } from "./WorkflowAgentId";
import { asWorkflowRunId } from "./WorkflowRunId";
import { DefaultWorkflowHandoffBuilder } from "./DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "./DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "./DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "./FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "./InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "./InMemoryWorkflowMemoryStore";
import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";

class DemoWorkflowAgent implements WorkflowAgent {
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
  return new DemoWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
}

async function main(): Promise<void> {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const invoker = new FakeWorkflowAgentInvoker();
  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("demo-run-1"),
  );

  const goal = {
    workspaceId: "workspace-a",
    objective:
      "Summarize last-quarter security policy changes and one-line risk.",
  };

  console.log("=== P3 Multi-Agent Workflow Engine Demo ===");
  console.log("Why: complex work as role-based backend workflows");
  console.log(`Workspace: ${goal.workspaceId}`);
  console.log(`Goal: ${goal.objective}`);

  const result = await orchestrator.run(goal);

  console.log("\n--- result ---");
  console.log(`status:  ${result.status}`);
  console.log(`runId:   ${result.workflowRunId}`);
  console.log(`summary: ${result.summary ?? ""}`);

  console.log("\n--- plan (Planner) ---");
  for (const step of result.plan.steps) {
    console.log(`  ${step.id}  role=${step.role}  agent=${step.agentId}`);
  }

  console.log("\n--- execution (Orchestrator → Handoff → Invoker) ---");
  for (const [i, step] of result.stepResults.entries()) {
    console.log(`\n[${i}] ${step.stepId}  ${step.role}  →  ${step.status}`);
    if (step.handoff) {
      console.log(
        `  handoff: ${step.handoff.kind}  ` +
          `${step.handoff.fromAgentId} → ${step.handoff.toAgentId}` +
          (step.handoff.reason ? `  (${step.handoff.reason})` : ""),
      );
      console.log(`  payload: ${step.handoff.payload}`);
    } else {
      console.log("  handoff: (none — first step uses objective)");
    }
    console.log(`  output:  ${step.output}`);
    if (step.error) {
      console.log(`  error:   ${step.error}`);
    }
  }

  console.log("\n--- shared workflow memory ---");
  const entries = await memory.listByRun(goal.workspaceId, result.workflowRunId);
  for (const entry of entries) {
    console.log(
      `  #${entry.sequence} ${entry.kind}` +
        (entry.handoffKind ? `/${entry.handoffKind}` : "") +
        `: ${entry.content}`,
    );
  }

  console.log("\nDemo finished. Validators: pnpm validate:workflow:orchestrator");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
