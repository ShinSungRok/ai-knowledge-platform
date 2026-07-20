import { readFileSync } from "node:fs";
import path from "node:path";

import { InMemoryMemoryStore } from "./InMemoryMemoryStore";
import type { MemoryStore } from "./MemoryStore";
import type { MemoryAppendInput } from "./MemoryStore";

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

function sampleAppend(
  overrides: Partial<MemoryAppendInput> = {},
): MemoryAppendInput {
  return {
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: "user",
    content: "hello",
    ...overrides,
  };
}

function buildStore(): MemoryStore {
  return new InMemoryMemoryStore();
}

function assertDoesNotImportKnowledgeOrSearch(): void {
  console.log("[memory] InMemoryMemoryStore imports no Knowledge/search/agent adapters...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/memory/InMemoryMemoryStore.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultInMemoryRepository",
    "KnowledgeDocumentRepository",
    "DocumentChunkRepository",
    "VectorRetriever",
    "HybridSearch",
    "DefaultKeywordSearch",
    "DefaultAgentOrchestrator",
    "ToolExecutor",
    "DefaultToolExecutor",
    "../persistence/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../agent/",
    "../tools/",
    "../application/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `InMemoryMemoryStore.ts must not reference "${reference}"`,
    );
  }
}

async function assertPortContract(): Promise<void> {
  console.log("[memory] port contract (MemoryStore via InMemoryMemoryStore)...");
  const store = buildStore();
  assertTruthy(typeof store.append === "function", "append must be defined");
  assertTruthy(typeof store.listBySession === "function", "listBySession must be defined");
}

async function assertAppendAndListOrdering(): Promise<void> {
  console.log("[memory] append assigns deterministic id/sequence; listBySession returns sequence ascending...");
  const store = buildStore();
  const first = await store.append(sampleAppend({ content: "first", role: "user" }));
  const second = await store.append(
    sampleAppend({ content: "second", role: "agent" }),
  );
  const third = await store.append(
    sampleAppend({ content: "third", role: "system" }),
  );

  assertEqual(first.sequence, 1, "expected first sequence=1");
  assertEqual(first.id, "workspace-a:session-1:1", "expected deterministic id");
  assertEqual(second.sequence, 2, "expected second sequence=2");
  assertEqual(second.id, "workspace-a:session-1:2", "expected second id");
  assertEqual(third.sequence, 3, "expected third sequence=3");

  const listed = await store.listBySession("workspace-a", "session-1");
  assertEqual(listed.length, 3, "expected three entries");
  assertEqual(listed.map((e) => e.sequence).join(","), "1,2,3", "expected ascending sequences");
  assertEqual(listed.map((e) => e.content).join(","), "first,second,third", "expected content order");
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[memory] same sessionId is isolated across workspaces...");
  const store = buildStore();
  await store.append(
    sampleAppend({ workspaceId: "workspace-a", sessionId: "shared", content: "a" }),
  );
  await store.append(
    sampleAppend({ workspaceId: "workspace-b", sessionId: "shared", content: "b" }),
  );

  const a = await store.listBySession("workspace-a", "shared");
  const b = await store.listBySession("workspace-b", "shared");
  assertEqual(a.length, 1, "expected one entry in workspace-a");
  assertEqual(b.length, 1, "expected one entry in workspace-b");
  assertEqual(a[0]?.content, "a", "expected workspace-a content");
  assertEqual(b[0]?.content, "b", "expected workspace-b content");
  assertEqual(a[0]?.id, "workspace-a:shared:1", "expected workspace-a id");
  assertEqual(b[0]?.id, "workspace-b:shared:1", "expected workspace-b id");
}

async function assertDefensiveCopyAndEmptySession(): Promise<void> {
  console.log("[memory] defensive copies on read/write; empty session returns []...");
  const store = buildStore();
  const empty = await store.listBySession("workspace-a", "missing");
  assertEqual(empty.length, 0, "expected empty array for missing session");

  const entry = await store.append(sampleAppend({ content: "original" }));
  entry.content = "mutated-returned";
  entry.sequence = 99;

  const listed = await store.listBySession("workspace-a", "session-1");
  assertEqual(listed[0]?.content, "original", "expected stored content unchanged after mutating returned entry");
  assertEqual(listed[0]?.sequence, 1, "expected stored sequence unchanged");

  listed[0]!.content = "mutated-listed";
  const listedAgain = await store.listBySession("workspace-a", "session-1");
  assertEqual(listedAgain[0]?.content, "original", "expected stored content unchanged after mutating list result");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[memory] append/list reject invalid input...");
  const store = buildStore();
  await assertThrowsAsync(
    () => store.append(null as unknown as MemoryAppendInput),
    "MemoryAppendInput must be an object",
  );
  await assertThrowsAsync(
    () => store.append(sampleAppend({ workspaceId: "  " })),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => store.append(sampleAppend({ sessionId: "" })),
    "sessionId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => store.append(sampleAppend({ content: "   " })),
    "content must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      store.append(
        sampleAppend({ role: "assistant" as unknown as MemoryAppendInput["role"] }),
      ),
    'MemoryAppendInput.role must be "user" | "agent" | "system"',
  );
  await assertThrowsAsync(
    () => store.listBySession("  ", "session-1"),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => store.listBySession("workspace-a", ""),
    "sessionId must be a non-empty string",
  );
}

async function main(): Promise<void> {
  assertDoesNotImportKnowledgeOrSearch();
  await assertPortContract();
  await assertAppendAndListOrdering();
  await assertWorkspaceIsolation();
  await assertDefensiveCopyAndEmptySession();
  await assertRejectsInvalidInput();
  console.log("InMemoryMemoryStore validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
