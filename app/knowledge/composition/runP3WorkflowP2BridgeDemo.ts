/**
 * P3 Workflow Engine demo with P2 Knowledge bridge (portfolio).
 *
 * Researcher step calls InMemory cited-answer after demo seed.
 * Synthesizer/critic stay on Fake echo.
 *
 *   pnpm demo:workflow:p2-bridge
 */
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import { DEMO_QUERY, seedDemoKnowledge } from "./seedDemoKnowledge";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { asWorkflowRunId } from "../workflow/WorkflowRunId";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import { KnowledgeAnswerWorkflowAgentInvoker } from "../workflow/KnowledgeAnswerWorkflowAgentInvoker";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import type { WorkflowKnowledgeAnswerPort } from "../workflow/WorkflowKnowledgeAnswerPort";

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
  const workspaceId = "workspace-a";
  const composition = createInMemoryKnowledgeComposition();
  await seedDemoKnowledge(composition, workspaceId);

  const knowledge: WorkflowKnowledgeAnswerPort = {
    async answer(input) {
      const cited = await composition.runtime.generateCitedGroundedAnswer({
        workspaceId: input.workspaceId,
        query: input.query,
      });
      return {
        answerText: cited.answer.text,
        citationCount: cited.citations.length,
        insufficientEvidence: cited.answer.insufficientEvidence,
      };
    },
  };

  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  const invoker = new KnowledgeAnswerWorkflowAgentInvoker(
    knowledge,
    new FakeWorkflowAgentInvoker(),
  );
  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("demo-bridge-run-1"),
  );

  console.log("=== P3 Workflow Engine × P2 Knowledge Bridge Demo ===");
  console.log("Why: prove Workflow Engine reuses P2 cited-answer as a tool");
  console.log(`Workspace: ${workspaceId}`);
  console.log(`Goal (DEMO_QUERY): ${DEMO_QUERY}`);

  const result = await orchestrator.run({
    workspaceId,
    objective: DEMO_QUERY,
  });

  console.log("\n--- result ---");
  console.log(`status:  ${result.status}`);
  console.log(`runId:   ${result.workflowRunId}`);
  console.log(`summary: ${result.summary ?? ""}`);

  console.log("\n--- execution ---");
  for (const [i, step] of result.stepResults.entries()) {
    console.log(`\n[${i}] ${step.stepId}  ${step.role}  →  ${step.status}`);
    if (step.handoff) {
      console.log(
        `  handoff: ${step.handoff.kind}  ` +
          `${step.handoff.fromAgentId} → ${step.handoff.toAgentId}`,
      );
    }
    console.log(`  output:  ${step.output}`);
  }

  console.log("\n--- shared workflow memory (truncated) ---");
  const entries = await memory.listByRun(workspaceId, result.workflowRunId);
  for (const entry of entries) {
    const preview =
      entry.content.length > 120
        ? `${entry.content.slice(0, 117)}...`
        : entry.content;
    console.log(`  #${entry.sequence} ${entry.kind}: ${preview}`);
  }

  console.log(
    "\nDemo finished. Validator: pnpm validate:workflow:p2-bridge",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
