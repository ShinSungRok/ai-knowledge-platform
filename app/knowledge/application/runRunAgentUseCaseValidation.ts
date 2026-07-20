import { readFileSync } from "node:fs";
import path from "node:path";

import { RunAgentUseCase } from "./RunAgentUseCase";
import type { RunAgentInput } from "./RunAgentUseCase";
import type { AgentOrchestrator } from "../agent/AgentOrchestrator";
import type { AgentGoal } from "../agent/AgentGoal";
import type { AgentRunResult } from "../agent/AgentRunResult";

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

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected async throw containing: ${messageSubstring}`);
}

class CountingAgentOrchestrator implements AgentOrchestrator {
  public runCalls = 0;
  public lastGoal: AgentGoal | null = null;
  public nextResult: AgentRunResult = {
    plan: {
      goal: {
        workspaceId: "workspace-a",
        query: "q",
        retrievalLimit: 1,
        maxCharacters: 100,
        toolTimeoutMs: 1_000,
      },
      steps: [],
    },
    stepResults: [],
    review: { decision: "approved", reason: "All tool calls succeeded" },
    status: "completed",
  };

  async run(goal: AgentGoal): Promise<AgentRunResult> {
    this.runCalls += 1;
    this.lastGoal = goal;
    return this.nextResult;
  }
}

function sampleInput(overrides: Partial<RunAgentInput> = {}): RunAgentInput {
  return {
    workspaceId: "workspace-a",
    query: "what is the policy?",
    retrievalLimit: 5,
    maxCharacters: 1_000,
    toolTimeoutMs: 2_000,
    ...overrides,
  };
}

function assertDependsOnlyOnAgentOrchestratorPort(): void {
  console.log("[application] RunAgentUseCase depends only on the AgentOrchestrator port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RunAgentUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "../agent/AgentOrchestrator"'),
    "Use case must import the AgentOrchestrator port",
  );
  const forbiddenReferences = [
    "DefaultAgentOrchestrator",
    "DeterministicKnowledgeAgentPlanner",
    "DefaultAgentStepExecutor",
    "DefaultAgentReviewer",
    "DefaultToolExecutor",
    "ExecuteToolCallUseCase",
    "InvokeMcpToolUseCase",
    "../tools/",
    "../persistence/",
    "../ai/",
    "../mcp/",
    'from "../tools',
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RunAgentUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertDelegatesToOrchestrator(): Promise<void> {
  console.log("[application] execute delegates to AgentOrchestrator.run and returns the result unchanged...");
  const orchestrator = new CountingAgentOrchestrator();
  const useCase = new RunAgentUseCase(orchestrator);
  const input = sampleInput();

  const result = await useCase.execute(input);

  assertEqual(orchestrator.runCalls, 1, "expected exactly one orchestrator.run call");
  assertEqual(orchestrator.lastGoal?.workspaceId, input.workspaceId, "expected goal.workspaceId");
  assertEqual(orchestrator.lastGoal?.query, input.query, "expected goal.query");
  assertEqual(orchestrator.lastGoal?.retrievalLimit, input.retrievalLimit, "expected goal.retrievalLimit");
  assertEqual(orchestrator.lastGoal?.maxCharacters, input.maxCharacters, "expected goal.maxCharacters");
  assertEqual(orchestrator.lastGoal?.toolTimeoutMs, input.toolTimeoutMs, "expected goal.toolTimeoutMs");
  assertEqual(result, orchestrator.nextResult, "expected AgentRunResult unchanged");
  assertEqual(result.status, "completed", "expected completed status passthrough");
}

async function assertRejectsInvalidInputWithoutCallingOrchestrator(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling AgentOrchestrator...");
  const orchestrator = new CountingAgentOrchestrator();
  const useCase = new RunAgentUseCase(orchestrator);

  await assertThrowsAsync(
    () => useCase.execute(null as unknown as RunAgentInput),
    "RunAgentInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ workspaceId: "  " })),
    "RunAgentInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ query: "" })),
    "RunAgentInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ retrievalLimit: 0 })),
    "RunAgentInput.retrievalLimit must be a positive integer",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ maxCharacters: -1 })),
    "RunAgentInput.maxCharacters must be a positive integer",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ toolTimeoutMs: 1.5 })),
    "RunAgentInput.toolTimeoutMs must be a positive integer",
  );
  assertEqual(orchestrator.runCalls, 0, "expected no orchestrator calls on invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnAgentOrchestratorPort();
  await assertDelegatesToOrchestrator();
  await assertRejectsInvalidInputWithoutCallingOrchestrator();
  console.log("RunAgentUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
