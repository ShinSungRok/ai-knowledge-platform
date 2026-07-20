import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AppendMemoryEntryUseCase,
  type AppendMemoryEntryInput,
} from "./AppendMemoryEntryUseCase";
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
  public lastAppend: MemoryAppendInput | null = null;
  public nextEntry: MemoryEntry = {
    id: "workspace-a:session-1:1",
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: "user",
    content: "hello",
    sequence: 1,
  };

  async append(input: MemoryAppendInput): Promise<MemoryEntry> {
    this.appendCalls += 1;
    this.lastAppend = input;
    return {
      ...this.nextEntry,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
    };
  }

  async listBySession(
    _workspaceId: string,
    _sessionId: string,
  ): Promise<MemoryEntry[]> {
    this.listCalls += 1;
    return [];
  }
}

function sampleInput(
  overrides: Partial<AppendMemoryEntryInput> = {},
): AppendMemoryEntryInput {
  return {
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: "user",
    content: "hello",
    ...overrides,
  };
}

function assertDependsOnlyOnMemoryStorePort(): void {
  console.log("[application] AppendMemoryEntryUseCase depends only on the MemoryStore port...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/application/AppendMemoryEntryUseCase.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  assertTruthy(
    source.includes('from "../memory/MemoryStore"'),
    "Use case must import MemoryStore port",
  );
  const forbiddenReferences = [
    "InMemoryMemoryStore",
    "DefaultInMemoryRepository",
    "AgentOrchestrator",
    "HybridSearch",
    "VectorRetriever",
    "../persistence/",
    "../search/",
    "../retrieval/",
    "../agent/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `AppendMemoryEntryUseCase.ts must not reference "${reference}"`,
    );
  }
}

async function assertDelegatesToStore(): Promise<void> {
  console.log("[application] execute delegates to MemoryStore.append and returns the entry unchanged...");
  const store = new CountingMemoryStore();
  const useCase = new AppendMemoryEntryUseCase(store);
  const input = sampleInput({ content: "what is the policy?", role: "user" });
  const result = await useCase.execute(input);

  assertEqual(store.appendCalls, 1, "expected one append call");
  assertEqual(store.listCalls, 0, "expected no list calls");
  assertEqual(store.lastAppend?.content, input.content, "expected content passthrough");
  assertEqual(result.content, input.content, "expected returned content");
  assertEqual(result.role, "user", "expected role passthrough");
}

async function assertRejectsInvalidWithoutCallingStore(): Promise<void> {
  console.log("[application] execute rejects invalid input without calling MemoryStore...");
  const store = new CountingMemoryStore();
  const useCase = new AppendMemoryEntryUseCase(store);

  await assertThrowsAsync(
    () => useCase.execute(null as unknown as AppendMemoryEntryInput),
    "AppendMemoryEntryInput must be an object",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ workspaceId: "  " })),
    "AppendMemoryEntryInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ sessionId: "" })),
    "AppendMemoryEntryInput.sessionId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      useCase.execute(
        sampleInput({ role: "bot" as unknown as AppendMemoryEntryInput["role"] }),
      ),
    'AppendMemoryEntryInput.role must be "user" | "agent" | "system"',
  );
  await assertThrowsAsync(
    () => useCase.execute(sampleInput({ content: "   " })),
    "AppendMemoryEntryInput.content must be a non-empty string",
  );
  assertEqual(store.appendCalls, 0, "expected no store calls on invalid input");
}

async function main(): Promise<void> {
  assertDependsOnlyOnMemoryStorePort();
  await assertDelegatesToStore();
  await assertRejectsInvalidWithoutCallingStore();
  console.log("AppendMemoryEntryUseCase validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
