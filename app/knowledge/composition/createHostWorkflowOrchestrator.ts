/**
 * Host-side Multi-Agent workflow wiring for `pnpm start` / listening servers.
 * Fake invoker by default; optional P2 researcher bridge via knowledge port;
 * optional LanguageModel for synthesizer/critic when HTTP LLM is configured.
 */
import type { LanguageModelProvider } from "../ai/LanguageModelProvider";
import { asWorkflowAgentId } from "../workflow/WorkflowAgentId";
import { DefaultWorkflowHandoffBuilder } from "../workflow/DefaultWorkflowHandoffBuilder";
import { DefaultWorkflowOrchestrator } from "../workflow/DefaultWorkflowOrchestrator";
import { DeterministicWorkflowPlanner } from "../workflow/DeterministicWorkflowPlanner";
import { FakeWorkflowAgentInvoker } from "../workflow/FakeWorkflowAgentInvoker";
import { InMemoryWorkflowAgentRegistry } from "../workflow/InMemoryWorkflowAgentRegistry";
import { InMemoryWorkflowMemoryStore } from "../workflow/InMemoryWorkflowMemoryStore";
import { InMemoryWorkflowRunStore } from "../workflow/InMemoryWorkflowRunStore";
import { KnowledgeAnswerWorkflowAgentInvoker } from "../workflow/KnowledgeAnswerWorkflowAgentInvoker";
import { LanguageModelWorkflowAgentInvoker } from "../workflow/LanguageModelWorkflowAgentInvoker";
import type { WorkflowAgent } from "../workflow/WorkflowAgent";
import type { WorkflowAgentDescriptor } from "../workflow/WorkflowAgentDescriptor";
import type { WorkflowAgentInvoker } from "../workflow/WorkflowAgentInvoker";
import type { WorkflowAgentRegistry } from "../workflow/WorkflowAgentRegistry";
import type { WorkflowAgentRole } from "../workflow/WorkflowAgentRole";
import type { WorkflowKnowledgeAnswerPort } from "../workflow/WorkflowKnowledgeAnswerPort";
import type { WorkflowMemoryStore } from "../workflow/WorkflowMemoryStore";
import type { WorkflowOrchestrator } from "../workflow/WorkflowOrchestrator";
import type { WorkflowRunStore } from "../workflow/WorkflowRunStore";
import type { KnowledgeRuntime } from "./KnowledgeRuntime";

class HostWorkflowAgent implements WorkflowAgent {
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
  return new HostWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
  });
}

export type CreateHostWorkflowOrchestratorOptions = {
  /**
   * When true and `runtime` is set, researcher steps use
   * {@link KnowledgeAnswerWorkflowAgentInvoker}; otherwise Fake echo only.
   */
  p2Bridge?: boolean;
  /** Required for p2Bridge. */
  runtime?: KnowledgeRuntime;
  /**
   * When set, synthesizer/critic steps use
   * {@link LanguageModelWorkflowAgentInvoker} (HTTP LLM on host when
   * `LLM_API_KEY` is set).
   */
  languageModelProvider?: LanguageModelProvider;
};

/**
 * Result of {@link createHostWorkflowOrchestrator}: the orchestrator plus
 * the memory/run stores and agent registry it was built with, so callers
 * (the listening host) can thread read access to all three into HTTP
 * controllers without the `WorkflowOrchestrator` port itself exposing them.
 */
export type HostWorkflowOrchestrator = {
  orchestrator: WorkflowOrchestrator;
  memory: WorkflowMemoryStore;
  runStore: WorkflowRunStore;
  registry: WorkflowAgentRegistry;
};

/**
 * Builds DefaultWorkflowOrchestrator with researcher/synthesizer/critic
 * and InMemory workflow memory. No Express; no SQL workflow memory.
 *
 * Invoker stack (outer → inner): optional knowledge bridge → optional LLM
 * roles → Fake echo.
 */
export function createHostWorkflowOrchestrator(
  options: CreateHostWorkflowOrchestratorOptions = {},
): HostWorkflowOrchestrator {
  const registry = new InMemoryWorkflowAgentRegistry();
  registry.register(agent("agent-researcher", "researcher", "Researcher"));
  registry.register(agent("agent-synthesizer", "synthesizer", "Synthesizer"));
  registry.register(agent("agent-critic", "critic", "Critic"));

  let invoker: WorkflowAgentInvoker = new FakeWorkflowAgentInvoker();
  if (options.languageModelProvider !== undefined) {
    invoker = new LanguageModelWorkflowAgentInvoker(
      options.languageModelProvider,
      invoker,
    );
  }
  if (options.p2Bridge === true) {
    if (options.runtime === undefined) {
      throw new Error(
        "createHostWorkflowOrchestrator p2Bridge requires runtime",
      );
    }
    const runtime = options.runtime;
    const knowledge: WorkflowKnowledgeAnswerPort = {
      async answer(input) {
        const cited = await runtime.generateCitedGroundedAnswer({
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
    invoker = new KnowledgeAnswerWorkflowAgentInvoker(knowledge, invoker);
  }

  const memory = new InMemoryWorkflowMemoryStore();
  const runStore = new InMemoryWorkflowRunStore();
  const orchestrator = new DefaultWorkflowOrchestrator(
    new DeterministicWorkflowPlanner(registry),
    registry,
    invoker,
    new DefaultWorkflowHandoffBuilder(),
    memory,
  );
  return { orchestrator, memory, runStore, registry };
}

/**
 * Resolves P2 researcher bridge for the listening host.
 *
 * - `WORKFLOW_P2_BRIDGE=1|true` → force on
 * - `WORKFLOW_P2_BRIDGE=0|false` → force off (Fake only)
 * - unset → on when demo seed runs (`skipDemoSeed === false`), else Fake
 */
export function resolveWorkflowP2Bridge(
  env: NodeJS.ProcessEnv,
  skipDemoSeed: boolean,
): boolean {
  const raw = env["WORKFLOW_P2_BRIDGE"]?.trim().toLowerCase();
  if (raw === "1" || raw === "true") {
    return true;
  }
  if (raw === "0" || raw === "false") {
    return false;
  }
  return !skipDemoSeed;
}
