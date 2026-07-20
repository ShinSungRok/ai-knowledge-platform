import { KNOWLEDGE_MODULE_MEMORY } from "./index";
import type { MemoryStore } from "./MemoryStore";
import type { MemoryAppendInput } from "./MemoryStore";
import type { MemoryEntry } from "./MemoryEntry";
import type { MemoryStore as TopLevelMemoryStore } from "../index";

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

/**
 * Minimal in-file test double proving `MemoryStore` is implementable
 * from just the exported contract types — no concrete adapter exists
 * yet (that is a later task).
 */
class FakeMemoryStore implements MemoryStore {
  private readonly entries: MemoryEntry[] = [];

  async append(input: MemoryAppendInput): Promise<MemoryEntry> {
    const sequence = this.entries.filter(
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
    return entry;
  }

  async listBySession(
    workspaceId: string,
    sessionId: string,
  ): Promise<MemoryEntry[]> {
    return this.entries.filter(
      (e) => e.workspaceId === workspaceId && e.sessionId === sessionId,
    );
  }
}

function assertModuleConstant(): void {
  console.log("[memory] KNOWLEDGE_MODULE_MEMORY constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_MEMORY,
    "app/knowledge/memory",
    "unexpected KNOWLEDGE_MODULE_MEMORY value",
  );
}

async function assertMemoryStorePortContract(): Promise<void> {
  console.log("[memory] port contract (MemoryStore) is implementable and callable...");
  const store: MemoryStore = new FakeMemoryStore();
  assertTruthy(typeof store.append === "function", "append must be defined");
  assertTruthy(typeof store.listBySession === "function", "listBySession must be defined");

  const entry = await store.append({
    workspaceId: "workspace-a",
    sessionId: "session-1",
    role: "user",
    content: "what is the policy?",
  });

  assertEqual(entry.workspaceId, "workspace-a", "expected workspaceId");
  assertEqual(entry.sessionId, "session-1", "expected sessionId");
  assertEqual(entry.role, "user", "expected role=user");
  assertEqual(entry.content, "what is the policy?", "expected content");
  assertEqual(typeof entry.id, "string", "expected id string");
  assertEqual(typeof entry.sequence, "number", "expected sequence number");
  assertTruthy(entry.sequence >= 1, "expected sequence >= 1");

  const listed = await store.listBySession("workspace-a", "session-1");
  assertEqual(listed.length, 1, "expected one listed entry");
  assertEqual(listed[0]?.id, entry.id, "expected listed entry id to match");
}

function assertTopLevelBarrelReExports(): void {
  console.log("[memory] top-level app/knowledge barrel re-exports the MemoryStore port type...");
  const _check: TopLevelMemoryStore = null as unknown as MemoryStore;
  void _check;
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertMemoryStorePortContract();
  assertTopLevelBarrelReExports();
  console.log("Memory contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
