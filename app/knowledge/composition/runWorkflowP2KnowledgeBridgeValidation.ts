/**
 * P3↔P2 knowledge bridge validation (dependency-free).
 *
 * Wires InMemory composition + demo seed into
 * KnowledgeAnswerWorkflowAgentInvoker so a researcher step returns a
 * grounded cited-answer — proving Workflow Engine reuses P2 serving.
 *
 *   pnpm validate:workflow:p2-bridge
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

class BridgeDemoAgent implements WorkflowAgent {
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
  return new BridgeDemoAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
}

async function main(): Promise<void> {
  const workspaceId = "workspace-a";
  console.log("[p2-bridge] create InMemory composition + seed...");
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

  const fallback = new FakeWorkflowAgentInvoker();
  const invoker = new KnowledgeAnswerWorkflowAgentInvoker(knowledge, fallback);
  const memory = new InMemoryWorkflowMemoryStore();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
    () => asWorkflowRunId("bridge-run-1"),
  );

  console.log("[p2-bridge] run workflow with DEMO_QUERY objective...");
  const result = await orchestrator.run({
    workspaceId,
    objective: DEMO_QUERY,
  });

  assertEqual(result.status, "completed", "workflow completed");
  assertEqual(result.stepResults.length, 3, "three steps");

  const researcher = result.stepResults[0];
  assertEqual(researcher?.role, "researcher", "first step researcher");
  assertEqual(researcher?.status, "completed", "researcher completed");
  assertTruthy(
    (researcher?.output ?? "").startsWith("knowledge:grounded:citations="),
    `researcher output must be grounded knowledge, got: ${researcher?.output}`,
  );
  assertTruthy(
    (researcher?.output ?? "").includes("citations=") &&
      !(researcher?.output ?? "").includes("citations=0"),
    "researcher must return at least one citation from seeded demo",
  );

  const synthesizer = result.stepResults[1];
  assertEqual(synthesizer?.role, "synthesizer", "second synthesizer");
  assertTruthy(
    (synthesizer?.output ?? "").startsWith("echo:synthesizer:"),
    "synthesizer still uses Fake fallback",
  );

  assertEqual(fallback.calls.length, 2, "fallback used for synth+critic only");

  console.log("Workflow P2 knowledge bridge validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
