import { readFileSync } from "node:fs";
import path from "node:path";

import { DeterministicKnowledgeAgentPlanner } from "./DeterministicKnowledgeAgentPlanner";
import type { AgentPlanner } from "./AgentPlanner";
import type { AgentGoal } from "./AgentGoal";

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

function sampleGoal(overrides: Partial<AgentGoal> = {}): AgentGoal {
  return {
    workspaceId: "workspace-a",
    query: "what is the policy?",
    retrievalLimit: 5,
    maxCharacters: 1_000,
    toolTimeoutMs: 2_000,
    ...overrides,
  };
}

function buildPlanner(): AgentPlanner {
  return new DeterministicKnowledgeAgentPlanner();
}

async function assertPortContract(): Promise<void> {
  console.log("[agent] port contract (AgentPlanner via DeterministicKnowledgeAgentPlanner)...");
  const planner = buildPlanner();
  assertTruthy(typeof planner.plan === "function", "plan must be defined");
}

async function assertValidSingleStepPlan(): Promise<void> {
  console.log("[agent] plan returns a single generate_cited_grounded_answer step for a valid goal...");
  const goal = sampleGoal();
  const plan = await buildPlanner().plan(goal);

  assertEqual(plan.goal.workspaceId, goal.workspaceId, "expected plan.goal.workspaceId copy");
  assertEqual(plan.goal.query, goal.query, "expected plan.goal.query copy");
  assertEqual(plan.goal.retrievalLimit, goal.retrievalLimit, "expected plan.goal.retrievalLimit copy");
  assertEqual(plan.goal.maxCharacters, goal.maxCharacters, "expected plan.goal.maxCharacters copy");
  assertEqual(plan.goal.toolTimeoutMs, goal.toolTimeoutMs, "expected plan.goal.toolTimeoutMs copy");
  assertEqual(plan.steps.length, 1, "expected exactly one plan step");
  assertEqual(plan.steps[0]?.id, "step-1", "expected steps[0].id = step-1");
  assertEqual(
    plan.steps[0]?.toolName,
    "generate_cited_grounded_answer",
    "expected steps[0].toolName = generate_cited_grounded_answer",
  );
  assertEqual(
    plan.steps[0]?.arguments["workspaceId"],
    goal.workspaceId,
    "expected arguments.workspaceId",
  );
  assertEqual(plan.steps[0]?.arguments["query"], goal.query, "expected arguments.query");
  assertEqual(
    plan.steps[0]?.arguments["retrievalLimit"],
    goal.retrievalLimit,
    "expected arguments.retrievalLimit",
  );
  assertEqual(
    plan.steps[0]?.arguments["maxCharacters"],
    goal.maxCharacters,
    "expected arguments.maxCharacters",
  );
  assertEqual(
    Object.keys(plan.steps[0]?.arguments ?? {}).sort().join(","),
    "maxCharacters,query,retrievalLimit,workspaceId",
    "expected only cited-answer argument keys (no toolTimeoutMs)",
  );
}

async function assertRejectsInvalidGoal(): Promise<void> {
  console.log("[agent] plan rejects invalid AgentGoal fields...");
  const planner = buildPlanner();

  await assertThrowsAsync(
    () => planner.plan(null as unknown as AgentGoal),
    "AgentGoal must be an object",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ workspaceId: "   " })),
    "AgentGoal.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ query: "" })),
    "AgentGoal.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ retrievalLimit: 0 })),
    "AgentGoal.retrievalLimit must be a positive integer",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ retrievalLimit: 1.5 })),
    "AgentGoal.retrievalLimit must be a positive integer",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ maxCharacters: -1 })),
    "AgentGoal.maxCharacters must be a positive integer",
  );
  await assertThrowsAsync(
    () => planner.plan(sampleGoal({ toolTimeoutMs: 0 })),
    "AgentGoal.toolTimeoutMs must be a positive integer",
  );
}

async function assertDeterminism(): Promise<void> {
  console.log("[agent] plan is byte-identical for identical valid goals...");
  const planner = buildPlanner();
  const goal = sampleGoal();
  const first = await planner.plan(goal);
  const second = await planner.plan(goal);
  assertEqual(
    JSON.stringify(first),
    JSON.stringify(second),
    "expected identical JSON serialization for repeated plan calls",
  );

  const otherPlanner = buildPlanner();
  const third = await otherPlanner.plan(sampleGoal());
  assertEqual(
    JSON.stringify(first),
    JSON.stringify(third),
    "expected identical JSON serialization across planner instances",
  );
}

function assertDoesNotImportExternalAdapters(): void {
  console.log("[agent] DeterministicKnowledgeAgentPlanner imports no ToolExecutor/LLM/repository adapters...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/agent/DeterministicKnowledgeAgentPlanner.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultToolExecutor",
    "LanguageModelProvider",
    "FakeLanguageModelProvider",
    "KnowledgeDocumentRepository",
    "DefaultInMemoryRepository",
    "McpToolRegistry",
    "AgentStepExecutor",
    "AgentReviewer",
    "AgentOrchestrator",
    "openai",
    "anthropic",
    "fetch(",
    "../tools/",
    "../application/",
    "../persistence/",
    "../repository/",
    "../ai/",
    "../mcp/",
    'from "../tools',
    'from "./Tool',
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DeterministicKnowledgeAgentPlanner.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertValidSingleStepPlan();
  await assertRejectsInvalidGoal();
  await assertDeterminism();
  assertDoesNotImportExternalAdapters();
  console.log("DeterministicKnowledgeAgentPlanner validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
