import { asEvaluationGateId } from "./EvaluationGateId";
import { InMemoryEvaluationGateDefinitionStore } from "./InMemoryEvaluationGateDefinitionStore";
import type {
  EvaluationGateDefinitionRegisterInput,
  EvaluationGateDefinitionStore,
} from "./EvaluationGateDefinitionStore";

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

function sampleRegister(
  overrides: Partial<EvaluationGateDefinitionRegisterInput> = {},
): EvaluationGateDefinitionRegisterInput {
  return {
    id: asEvaluationGateId("gate-def-default"),
    workspaceId: "workspace-a",
    name: "default-quality-gate",
    rules: [{ metricKey: "hitRateAtK", comparator: "gte", threshold: 0.8 }],
    ...overrides,
  };
}

function buildStore(): EvaluationGateDefinitionStore {
  return new InMemoryEvaluationGateDefinitionStore();
}

async function assertHappyPath(): Promise<void> {
  console.log("[llmops-gate-definition] register/getById/listByWorkspace...");
  const store = buildStore();
  const created = await store.register(sampleRegister());
  assertEqual(created.name, "default-quality-gate", "name");
  assertEqual(created.rules.length, 1, "one rule");

  const fetched = await store.getById(
    "workspace-a",
    asEvaluationGateId("gate-def-default"),
  );
  assertEqual(fetched?.name, "default-quality-gate", "getById name");

  const listed = await store.listByWorkspace("workspace-a");
  assertEqual(listed.length, 1, "one definition listed");
}

async function assertMultipleComparatorsAndRules(): Promise<void> {
  console.log("[llmops-gate-definition] eq/lte comparators reachable...");
  const store = buildStore();
  const created = await store.register(
    sampleRegister({
      id: asEvaluationGateId("gate-custom"),
      rules: [
        { metricKey: "latencyMs", comparator: "lte", threshold: 500 },
        { metricKey: "citationCount", comparator: "eq", threshold: 1 },
      ],
    }),
  );
  assertEqual(created.rules[0]?.comparator, "lte", "lte rule");
  assertEqual(created.rules[1]?.comparator, "eq", "eq rule");
}

async function assertDuplicateThrows(): Promise<void> {
  console.log("[llmops-gate-definition] duplicate id throws...");
  const store = buildStore();
  await store.register(sampleRegister());
  await assertThrowsAsync(
    () => store.register(sampleRegister()),
    "Duplicate evaluation gate id",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops-gate-definition] workspace isolation...");
  const store = buildStore();
  await store.register(sampleRegister({ workspaceId: "workspace-a" }));
  await store.register(sampleRegister({ workspaceId: "workspace-b" }));
  assertEqual(
    (await store.listByWorkspace("workspace-a")).length,
    1,
    "workspace-a count",
  );
  assertEqual(
    (await store.listByWorkspace("workspace-b")).length,
    1,
    "workspace-b count",
  );
  assertEqual(
    await store.getById("workspace-b", asEvaluationGateId("does-not-exist")),
    null,
    "unknown id returns null",
  );
}

async function assertEmptyRulesRejected(): Promise<void> {
  console.log("[llmops-gate-definition] empty rules rejected...");
  const store = buildStore();
  await assertThrowsAsync(
    () => store.register(sampleRegister({ rules: [] })),
    "rules must be a non-empty array",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops-gate-definition] defensive copies...");
  const store = buildStore();
  const rules = [{ metricKey: "hitRateAtK", comparator: "gte" as const, threshold: 0.8 }];
  const created = await store.register(sampleRegister({ rules }));
  rules[0]!.threshold = 0.99;
  (created.rules[0] as { threshold: number }).threshold = 0.5;
  const found = await store.getById(
    "workspace-a",
    asEvaluationGateId("gate-def-default"),
  );
  assertEqual(found?.rules[0]?.threshold, 0.8, "rules unchanged");
}

async function main(): Promise<void> {
  await assertHappyPath();
  await assertMultipleComparatorsAndRules();
  await assertDuplicateThrows();
  await assertWorkspaceIsolation();
  await assertEmptyRulesRejected();
  await assertDefensiveCopies();
  console.log("InMemory evaluation gate definition store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
