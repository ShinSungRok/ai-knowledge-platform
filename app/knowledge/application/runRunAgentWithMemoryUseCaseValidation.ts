import { readFileSync } from "node:fs";
import path from "node:path";

import {
  RunAgentWithMemoryUseCase,
  type RunAgentWithMemoryInput,
} from "./RunAgentWithMemoryUseCase";
import type { AgentOrchestrator } from "../agent/AgentOrchestrator";
import type { AgentGoal } from "../agent/AgentGoal";
import type { AgentRunResult } from "../agent/AgentRunResult";
import type { MemoryStore } from "../memory/MemoryStore";
import type { MemoryAppendInput } from "../memory/MemoryStore";
import type { MemoryEntry } from "../memory/MemoryEntry";

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

class RecordingMemoryStore implements MemoryStore {
  public readonly callLog: string[] = [];
  public readonly entries: MemoryEntry[] = [];
  public listCalls = 0;
  public appendCalls = 0;

  async listBySession(
    workspaceId: string,
    sessionId: string,
  ): Promise<MemoryEntry[]> {
    this.listCalls += 1;
    this.callLog.push(`list:${workspaceId}:${sessionId}`);
    return this.entries
      .filter((e) => e.workspaceId === workspaceId && e.sessionId === sessionId)
      .map((e) => ({ ...e }));
  }

  async append(input: MemoryAppendInput): Promise<MemoryEntry> {
    this.appendCalls += 1;
    this.callLog.push(`append:${input.role}:${input.content}`);
    const sequence =
      this.entries.filter(
        (e) =>
          e.workspaceId === input.workspaceId && e.sessionId === input.sessionId,
      ).length + 1;
    const entry: MemoryEntry = {
      id: `${input.workspaceId}:${input.sessionId}:${sequence}`,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      sequence,
    };
    this.entries.push(entry);
    return { ...entry };
  }
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

function sampleInput(
  overrides: Partial<RunAgentWithMemoryInput> = {},
): RunAgentWithMemoryInput {
  return {
    workspaceId: "workspace-a",
    query: "what is the policy?",
    retrievalLimit: 5,
    maxCharacters: 1_000,
    toolTimeoutMs: 2_000,
    sessionId: "session-1",
    ...overrides,
  };
}

function assertDependsOnlyOnPorts(): void {
  console.log("[application] RunAgentWithMemoryUseCase depends only on MemoryStore and AgentOrchestrator ports...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RunAgentWithMemoryUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../memory/MemoryStore"'),
    "Use case must import MemoryStore port",
  );
  assertTruthy(
    source.includes('from "../agent/AgentOrchestrator"'),
    "Use case must import AgentOrchestrator port",
  );
  const forbiddenReferences = [
    "InMemoryMemoryStore",
    "DefaultAgentOrchestrator",
    "DeterministicKnowledgeAgentPlanner",
    "DefaultAgentStepExecutor",
    "DefaultAgentReviewer",
    "AppendMemoryEntryUseCase",
    "RecallMemoryEntriesUseCase",
    "RunAgentUseCase",
    "HybridSearch",
    "VectorRetriever",
    "../persistence/",
    "../search/",
    "../retrieval/",
    "../tools/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RunAgentWithMemoryUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertRecallBeforeWriteOrderingAndContent(): Promise<void> {
  console.log("[application] execute recalls before write, appends user then agent, passes AgentRunResult unchanged...");
  const store = new RecordingMemoryStore();
  await store.append({
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: "system",
    content: "prior",
  });
  store.callLog.length = 0;
  store.listCalls = 0;
  store.appendCalls = 0;

  const orchestrator = new CountingAgentOrchestrator();
  const useCase = new RunAgentWithMemoryUseCase(store, orchestrator);
  const input = sampleInput();
  const result = await useCase.execute(input);

  assertEqual(
    store.callLog.join("|"),
    "list:workspace-a:session-1|append:user:what is the policy?|append:agent:status=completed; decision=approved; reason=All tool calls succeeded",
    "expected recall-before-write ordering and fixed agent summary",
  );
  assertEqual(store.listCalls, 1, "expected one list call");
  assertEqual(store.appendCalls, 2, "expected two append calls");
  assertEqual(orchestrator.runCalls, 1, "expected one orchestrator.run call");
  assertEqual(result.recalled.length, 1, "expected recalled prior entry only");
  assertEqual(result.recalled[0]?.content, "prior", "expected prior recall content");
  assertEqual(result.run, orchestrator.nextResult, "expected AgentRunResult unchanged");
  assertEqual(result.written.length, 2, "expected written tuple length 2");
  assertEqual(result.written[0]?.role, "user", "expected first written role=user");
  assertEqual(result.written[0]?.content, input.query, "expected user content=query");
  assertEqual(result.written[1]?.role, "agent", "expected second written role=agent");
  assertEqual(
    result.written[1]?.content,
    "status=completed; decision=approved; reason=All tool calls succeeded",
    "expected fixed agent summary format",
  );
  assertEqual(orchestrator.lastGoal?.query, input.query, "expected goal.query");
  assertEqual(orchestrator.lastGoal?.toolTimeoutMs, input.toolTimeoutMs, "expected goal.toolTimeoutMs");
}

async function assertWorkspaceSessionIsolation(): Promise<void> {
  console.log("[application] execute scopes memory to workspace+session...");
  const store = new RecordingMemoryStore();
  const orchestrator = new CountingAgentOrchestrator();
  const useCase = new RunAgentWithMemoryUseCase(store, orchestrator);

  await useCase.execute(sampleInput({ sessionId: "session-1", query: "q1" }));
  await useCase.execute(
    sampleInput({
      workspaceId: "workspace-b",
      sessionId: "session-1",
      query: "q2",
    }),
  );

  const a = await store.listBySession("workspace-a", "session-1");
  const b = await store.listBySession("workspace-b", "session-1");
  assertEqual(a.length, 2, "expected workspace-a session entries");
  assertEqual(b.length, 2, "expected workspace-b session entries");
  assertEqual(a[0]?.content, "q1", "expected workspace-a user query");
  assertEqual(b[0]?.content, "q2", "expected workspace-b user query");
}

async function assertRejectsInvalidWithoutCallingDeps(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling store or orchestrator...");
  const store = new RecordingMemoryStore();
  const orchestrator = new CountingAgentOrchestrator();
  const useCase = new RunAgentWithMemoryUseCase(store, orchestrator);

  await assertThrowsAsync(
    () => useCase.execute(null as unknown as RunAgentWithMemoryInput),
    "RunAgentWithMemoryInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ workspaceId: "  " })),
    "RunAgentWithMemoryInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ query: "" })),
    "RunAgentWithMemoryInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ retrievalLimit: 0 })),
    "RunAgentWithMemoryInput.retrievalLimit must be a positive integer",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ sessionId: "   " })),
    "RunAgentWithMemoryInput.sessionId must be a non-empty string",
  );
  assertEqual(store.listCalls, 0, "expected no list calls");
  assertEqual(store.appendCalls, 0, "expected no append calls");
  assertEqual(orchestrator.runCalls, 0, "expected no orchestrator calls");
}

async function main(): Promise<void> {
  assertDependsOnlyOnPorts();
  await assertRecallBeforeWriteOrderingAndContent();
  await assertWorkspaceSessionIsolation();
  await assertRejectsInvalidWithoutCallingDeps();
  console.log("RunAgentWithMemoryUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
