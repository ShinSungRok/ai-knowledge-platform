import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultAgentStepExecutor } from "./DefaultAgentStepExecutor";
import type { ToolExecutor } from "../tools/ToolExecutor";
import type { ToolCallRequest } from "../tools/ToolCallRequest";
import type { ToolCallResult } from "../tools/ToolCallResult";
import type { AgentPlanStep } from "./AgentPlanStep";
import type { AgentStepExecutor } from "./AgentStepExecutor";

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

class CountingToolExecutor implements ToolExecutor {
  public executeCalls = 0;
  public lastRequest: ToolCallRequest | null = null;
  public nextResult: ToolCallResult = {
    ok: true,
    status: "success",
    toolName: "generate_cited_grounded_answer",
    result: { echoed: true },
    durationMs: 12,
  };

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    this.executeCalls += 1;
    this.lastRequest = request;
    return this.nextResult;
  }
}

function sampleStep(overrides: Partial<AgentPlanStep> = {}): AgentPlanStep {
  return {
    id: "step-1",
    toolName: "generate_cited_grounded_answer",
    arguments: {
      workspaceId: "workspace-a",
      query: "what is the policy?",
      retrievalLimit: 5,
      maxCharacters: 1_000,
    },
    ...overrides,
  };
}

function buildExecutor(toolExecutor: ToolExecutor): AgentStepExecutor {
  return new DefaultAgentStepExecutor(toolExecutor);
}

function assertDependsOnlyOnToolExecutorPort(): void {
  console.log("[agent] DefaultAgentStepExecutor depends only on the ToolExecutor port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/agent/DefaultAgentStepExecutor.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  assertTruthy(
    source.includes('from "../tools/ToolExecutor"'),
    "Step executor must import the ToolExecutor port",
  );
  const forbiddenReferences = [
    "DefaultToolExecutor",
    "McpToolRegistry",
    "DefaultMcpToolRegistry",
    "LanguageModelProvider",
    "DefaultInMemoryRepository",
    "AgentPlanner",
    "AgentReviewer",
    "AgentOrchestrator",
    "ExecuteToolCallUseCase",
    "../application/",
    "../persistence/",
    "../mcp/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultAgentStepExecutor.ts must not reference "${reference}"`,
    );
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[agent] port contract (AgentStepExecutor via DefaultAgentStepExecutor)...");
  const executor = buildExecutor(new CountingToolExecutor());
  assertTruthy(typeof executor.executeStep === "function", "executeStep must be defined");
}

async function assertDelegatesToToolExecutor(): Promise<void> {
  console.log("[agent] executeStep delegates to ToolExecutor.execute and wraps the unchanged ToolCallResult...");
  const toolExecutor = new CountingToolExecutor();
  const step = sampleStep();
  const result = await buildExecutor(toolExecutor).executeStep(step, 2_000);

  assertEqual(toolExecutor.executeCalls, 1, "expected exactly one ToolExecutor.execute call");
  assertEqual(toolExecutor.lastRequest?.name, step.toolName, "expected request.name = step.toolName");
  assertEqual(
    toolExecutor.lastRequest?.timeoutMs,
    2_000,
    "expected request.timeoutMs from executeStep",
  );
  assertEqual(
    toolExecutor.lastRequest?.arguments["workspaceId"],
    step.arguments["workspaceId"],
    "expected request.arguments unchanged",
  );
  assertEqual(result.stepId, step.id, "expected stepId = step.id");
  assertEqual(result.toolCall, toolExecutor.nextResult, "expected toolCall reference unchanged");
  assertEqual(result.toolCall.status, "success", "expected success status passthrough");
  assertEqual(result.toolCall.durationMs, 12, "expected durationMs passthrough");
}

async function assertRejectsInvalidStepOrTimeout(): Promise<void> {
  console.log("[agent] executeStep rejects invalid step/timeout without calling ToolExecutor...");
  const toolExecutor = new CountingToolExecutor();
  const executor = buildExecutor(toolExecutor);

  await assertThrowsAsync(
    () => executor.executeStep(null as unknown as AgentPlanStep, 1_000),
    "AgentPlanStep must be an object",
  );
  await assertThrowsAsync(
    () => executor.executeStep(sampleStep({ id: "  " }), 1_000),
    "AgentPlanStep.id must be a non-empty string",
  );
  await assertThrowsAsync(
    () => executor.executeStep(sampleStep({ toolName: "" }), 1_000),
    "AgentPlanStep.toolName must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      executor.executeStep(
        sampleStep({ arguments: null as unknown as Record<string, unknown> }),
        1_000,
      ),
    "AgentPlanStep.arguments must be an object",
  );
  await assertThrowsAsync(
    () => executor.executeStep(sampleStep(), 0),
    "timeoutMs must be a positive integer",
  );
  await assertThrowsAsync(
    () => executor.executeStep(sampleStep(), 1.5),
    "timeoutMs must be a positive integer",
  );
  assertEqual(toolExecutor.executeCalls, 0, "expected no ToolExecutor calls on invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnToolExecutorPort();
  await assertPortContract();
  await assertDelegatesToToolExecutor();
  await assertRejectsInvalidStepOrTimeout();
  console.log("DefaultAgentStepExecutor validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
