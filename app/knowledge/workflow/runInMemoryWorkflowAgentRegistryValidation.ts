import { asWorkflowAgentId } from "./WorkflowAgentId";
import { InMemoryWorkflowAgentRegistry } from "./InMemoryWorkflowAgentRegistry";
import type { WorkflowAgent } from "./WorkflowAgent";
import type { WorkflowAgentDescriptor } from "./WorkflowAgentDescriptor";
import type { WorkflowAgentRegistry } from "./WorkflowAgentRegistry";
import type { WorkflowAgentRole } from "./WorkflowAgentRole";

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

function assertThrows(fn: () => void, messageSubstring: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected throw containing: ${messageSubstring}`);
}

class FakeWorkflowAgent implements WorkflowAgent {
  readonly descriptor: WorkflowAgentDescriptor;

  constructor(descriptor: WorkflowAgentDescriptor) {
    this.descriptor = descriptor;
  }
}

function agent(
  id: string,
  role: WorkflowAgentRole,
  displayName: string,
  capabilities?: readonly string[],
): WorkflowAgent {
  return new FakeWorkflowAgent({
    id: asWorkflowAgentId(id),
    role,
    displayName,
    ...(capabilities !== undefined ? { capabilities } : {}),
  });
}

function buildRegistry(): WorkflowAgentRegistry {
  return new InMemoryWorkflowAgentRegistry();
}

function assertRegisterGetAndList(): void {
  console.log(
    "[workflow] register + getById + listByRole + listAll...",
  );
  const registry = buildRegistry();
  registry.register(agent("a-coord", "coordinator", "Coord"));
  registry.register(agent("a-research", "researcher", "Research", ["search"]));
  registry.register(agent("a-critic", "critic", "Critic"));

  const found = registry.getById(asWorkflowAgentId("a-research"));
  assertTruthy(found !== null, "expected getById to find researcher");
  assertEqual(found?.descriptor.displayName, "Research", "displayName");
  assertEqual(found?.descriptor.role, "researcher", "role");

  assertEqual(
    registry.getById(asWorkflowAgentId("missing")),
    null,
    "missing id returns null",
  );

  const researchers = registry.listByRole("researcher");
  assertEqual(researchers.length, 1, "one researcher");
  assertEqual(researchers[0]?.descriptor.id, "a-research", "researcher id");

  const critics = registry.listByRole("critic");
  assertEqual(critics.length, 1, "one critic");
  assertEqual(
    registry.listByRole("synthesizer").length,
    0,
    "no synthesizers yet",
  );

  const all = registry.listAll();
  assertEqual(all.length, 3, "listAll length");
  const ids = new Set(all.map((entry) => entry.descriptor.id as string));
  assertTruthy(ids.has("a-coord"), "listAll includes coordinator");
  assertTruthy(ids.has("a-research"), "listAll includes researcher");
  assertTruthy(ids.has("a-critic"), "listAll includes critic");
}

function assertDuplicateIdThrows(): void {
  console.log("[workflow] duplicate id throws...");
  const registry = buildRegistry();
  registry.register(agent("dup", "executor", "First"));
  assertThrows(
    () => registry.register(agent("dup", "critic", "Second")),
    "Duplicate workflow agent id",
  );
}

function assertEmptyFieldsThrow(): void {
  console.log("[workflow] empty id / displayName throw...");
  const registry = buildRegistry();
  assertThrows(
    () => registry.register(agent("   ", "coordinator", "Name")),
    "non-empty string",
  );
  assertThrows(
    () => registry.register(agent("ok-id", "coordinator", "  ")),
    "non-empty string",
  );
}

function assertRoleIsolation(): void {
  console.log("[workflow] role isolation between listByRole results...");
  const registry = buildRegistry();
  registry.register(agent("r1", "researcher", "R1"));
  registry.register(agent("r2", "researcher", "R2"));
  registry.register(agent("c1", "critic", "C1"));
  assertEqual(registry.listByRole("researcher").length, 2, "two researchers");
  assertEqual(registry.listByRole("critic").length, 1, "one critic");
  assertEqual(registry.listByRole("executor").length, 0, "no executors");
}

function assertDefensiveCopy(): void {
  console.log(
    "[workflow] mutating returned list does not corrupt store...",
  );
  const registry = buildRegistry();
  registry.register(agent("keep", "synthesizer", "Keep", ["cap-a"]));
  const listed = registry.listAll() as WorkflowAgent[];
  listed.pop();
  (listed as { push: (value: WorkflowAgent) => void }).push(
    agent("injected", "critic", "Injected"),
  );
  const again = registry.listAll();
  assertEqual(again.length, 1, "store length unchanged after list mutate");
  assertEqual(again[0]?.descriptor.id, "keep", "store entry unchanged");

  const byRole = registry.listByRole("synthesizer") as WorkflowAgent[];
  const first = byRole[0];
  assertTruthy(first !== undefined, "expected synthesizer");
  (first!.descriptor as { displayName: string }).displayName = "Mutated";
  if (first!.descriptor.capabilities) {
    (first!.descriptor.capabilities as string[]).push("injected-cap");
  }
  const refetch = registry.getById(asWorkflowAgentId("keep"));
  assertEqual(
    refetch?.descriptor.displayName,
    "Keep",
    "descriptor displayName not mutated via list copy",
  );
  assertEqual(
    refetch?.descriptor.capabilities?.length,
    1,
    "capabilities not mutated via list copy",
  );
}

function main(): void {
  assertRegisterGetAndList();
  assertDuplicateIdThrows();
  assertEmptyFieldsThrow();
  assertRoleIsolation();
  assertDefensiveCopy();
  console.log("InMemory workflow agent registry validation succeeded.");
}

main();
