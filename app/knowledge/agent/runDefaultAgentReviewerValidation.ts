import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultAgentReviewer } from "./DefaultAgentReviewer";
import type { AgentReviewer } from "./AgentReviewer";
import type { AgentPlan } from "./AgentPlan";
import type { AgentStepResult } from "./AgentStepResult";
import type { ToolCallResult } from "../tools/ToolCallResult";

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

function samplePlan(stepCount = 1): AgentPlan {
  const steps = Array.from({ length: stepCount }, (_, index) => ({
    id: `step-${index + 1}`,
    toolName: "generate_cited_grounded_answer",
    arguments: { workspaceId: "workspace-a", query: "q", retrievalLimit: 1, maxCharacters: 100 },
  }));
  return {
    goal: {
      workspaceId: "workspace-a",
      query: "q",
      retrievalLimit: 1,
      maxCharacters: 100,
      toolTimeoutMs: 1_000,
    },
    steps,
  };
}

function toolCall(
  overrides: Partial<ToolCallResult> & Pick<ToolCallResult, "status">,
): ToolCallResult {
  const status = overrides.status;
  if (status === "success") {
    const { result, durationMs, toolName } = overrides;
    return {
      ok: true,
      status: "success",
      toolName: toolName ?? "generate_cited_grounded_answer",
      result: result ?? { text: "answer" },
      durationMs: durationMs ?? 1,
    };
  }
  const { error, durationMs, toolName } = overrides;
  return {
    ok: false,
    status,
    toolName: toolName ?? "generate_cited_grounded_answer",
    error: error ?? "failed",
    durationMs: durationMs ?? 1,
  };
}

function stepResult(
  stepId: string,
  call: ToolCallResult,
): AgentStepResult {
  return { stepId, toolCall: call };
}

function buildReviewer(): AgentReviewer {
  return new DefaultAgentReviewer();
}

function assertDependsOnNoExternalAdapters(): void {
  console.log("[agent] DefaultAgentReviewer imports no ToolExecutor/LLM/repository adapters...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/agent/DefaultAgentReviewer.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultToolExecutor",
    "ToolExecutor",
    "LanguageModelProvider",
    "DefaultInMemoryRepository",
    "AgentPlanner",
    "AgentStepExecutor",
    "AgentOrchestrator",
    "ExecuteToolCallUseCase",
    "../tools/",
    "../application/",
    "../persistence/",
    "../ai/",
    "../mcp/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultAgentReviewer.ts must not reference "${reference}"`,
    );
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[agent] port contract (AgentReviewer via DefaultAgentReviewer)...");
  const reviewer = buildReviewer();
  assertTruthy(typeof reviewer.review === "function", "review must be defined");
}

async function assertApprovesAllSuccess(): Promise<void> {
  console.log("[agent] review approves when every tool call status is success...");
  const plan = samplePlan(2);
  const result = await buildReviewer().review(plan, [
    stepResult("step-1", toolCall({ status: "success" })),
    stepResult("step-2", toolCall({ status: "success" })),
  ]);
  assertEqual(result.decision, "approved", "expected approved");
  assertEqual(result.reason, "All tool calls succeeded", "expected success reason");
}

async function assertRejectsCountMismatch(): Promise<void> {
  console.log("[agent] review rejects when step result count mismatches plan steps...");
  const plan = samplePlan(2);
  const result = await buildReviewer().review(plan, [
    stepResult("step-1", toolCall({ status: "success" })),
  ]);
  assertEqual(result.decision, "rejected", "expected rejected on mismatch");
  assertEqual(result.reason, "Step result count mismatch", "expected mismatch reason");
}

async function assertRejectsNonSuccessStatus(): Promise<void> {
  console.log("[agent] review rejects when any tool call status is not success...");
  const plan = samplePlan(1);
  for (const status of ["failure", "timeout", "unknown_tool", "invalid_request"] as const) {
    const result = await buildReviewer().review(plan, [
      stepResult("step-1", toolCall({ status })),
    ]);
    assertEqual(result.decision, "rejected", `expected rejected for status=${status}`);
    assertEqual(
      result.reason,
      `Tool call did not succeed: ${status}`,
      `expected status reason for ${status}`,
    );
  }
}

async function assertDoesNotInterpretAnswerText(): Promise<void> {
  console.log("[agent] review does not reinterpret answer text — status alone decides...");
  const plan = samplePlan(1);
  const result = await buildReviewer().review(plan, [
    stepResult(
      "step-1",
      toolCall({
        status: "success",
        result: { text: "completely wrong answer", evidence: [] },
      }),
    ),
  ]);
  assertEqual(result.decision, "approved", "expected approved despite answer text content");
  assertEqual(result.reason, "All tool calls succeeded", "expected status-only reason");
}

async function main(): Promise<void> {
  assertDependsOnNoExternalAdapters();
  await assertPortContract();
  await assertApprovesAllSuccess();
  await assertRejectsCountMismatch();
  await assertRejectsNonSuccessStatus();
  await assertDoesNotInterpretAnswerText();
  console.log("DefaultAgentReviewer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
