import { readFileSync } from "node:fs";
import path from "node:path";

import {
  RecallMemoryEntriesUseCase,
  type RecallMemoryEntriesInput,
} from "./RecallMemoryEntriesUseCase";
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

class CountingMemoryStore implements MemoryStore {
  public appendCalls = 0;
  public listCalls = 0;
  public lastWorkspaceId: string | null = null;
  public lastSessionId: string | null = null;
  public nextEntries: MemoryEntry[] = [];

  async append(_input: MemoryAppendInput): Promise<MemoryEntry> {
    this.appendCalls += 1;
    throw new Error("append should not be called");
  }

  async listBySession(
    workspaceId: string,
    sessionId: string,
  ): Promise<MemoryEntry[]> {
    this.listCalls += 1;
    this.lastWorkspaceId = workspaceId;
    this.lastSessionId = sessionId;
    return this.nextEntries.map((e) => ({ ...e }));
  }
}

function entry(sequence: number): MemoryEntry {
  return {
    id: `workspace-a:session-1:${sequence}`,
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: sequence % 2 === 0 ? "agent" : "user",
    content: `entry-${sequence}`,
    sequence,
  };
}

function assertDependsOnlyOnMemoryStorePort(): void {
  console.log("[application] RecallMemoryEntriesUseCase depends only on the MemoryStore port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/RecallMemoryEntriesUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../memory/MemoryStore"'),
    "Use case must import MemoryStore port",
  );
  const forbiddenReferences = [
    "InMemoryMemoryStore",
    "DefaultInMemoryRepository",
    "HybridSearch",
    "VectorRetriever",
    "KeywordSearch",
    "../persistence/",
    "../search/",
    "../retrieval/",
    "../agent/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `RecallMemoryEntriesUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertDelegatesWithoutLimit(): Promise<void> {
  console.log("[application] execute without limit returns full listBySession result...");
  const store = new CountingMemoryStore();
  store.nextEntries = [entry(1), entry(2), entry(3)];
  const useCase = new RecallMemoryEntriesUseCase(store);
  const result = await useCase.execute({
    workspaceId: "workspace-a",
    sessionId: "session-1",
  });

  assertEqual(store.listCalls, 1, "expected one list call");
  assertEqual(store.appendCalls, 0, "expected no append calls");
  assertEqual(result.length, 3, "expected all entries");
  assertEqual(result.map((e) => e.sequence).join(","), "1,2,3", "expected full sequence order");
}

async function assertLimitWindowing(): Promise<void> {
  console.log("[application] execute with limit returns newest limit entries in sequence ascending order...");
  const store = new CountingMemoryStore();
  store.nextEntries = [entry(1), entry(2), entry(3), entry(4), entry(5)];
  const useCase = new RecallMemoryEntriesUseCase(store);
  const result = await useCase.execute({
    workspaceId: "workspace-a",
    sessionId: "session-1",
    limit: 2,
  });

  assertEqual(result.length, 2, "expected two newest entries");
  assertEqual(result.map((e) => e.sequence).join(","), "4,5", "expected sequences 4,5 ascending");
  assertEqual(result.map((e) => e.content).join(","), "entry-4,entry-5", "expected newest contents");
}

async function assertRejectsInvalidWithoutCallingStore(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling MemoryStore...");
  const store = new CountingMemoryStore();
  const useCase = new RecallMemoryEntriesUseCase(store);

  await assertThrowsAsync(
    () => useCase.execute(null as unknown as RecallMemoryEntriesInput),
    "RecallMemoryEntriesInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute({ workspaceId: "  ", sessionId: "session-1" }),
    "RecallMemoryEntriesInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute({ workspaceId: "workspace-a", sessionId: "" }),
    "RecallMemoryEntriesInput.sessionId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      useCase.execute({
        workspaceId: "workspace-a",
        sessionId: "session-1",
        limit: 0,
      }),
    "RecallMemoryEntriesInput.limit must be a positive integer",
  );
  assertEqual(store.listCalls, 0, "expected no store calls on invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnMemoryStorePort();
  await assertDelegatesWithoutLimit();
  await assertLimitWindowing();
  await assertRejectsInvalidWithoutCallingStore();
  console.log("RecallMemoryEntriesUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
