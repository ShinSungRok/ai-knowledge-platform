import { asExperimentRunId } from "./ExperimentRunId";
import { asLlmopsObservationId } from "./LlmopsObservationId";
import { InMemoryLlmopsObservationStore } from "./InMemoryLlmopsObservationStore";
import type { LlmopsObservationStore } from "./LlmopsObservationStore";
import { asServingConfigId } from "./ServingConfigId";

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

function buildStore(): LlmopsObservationStore {
  return new InMemoryLlmopsObservationStore();
}

async function assertHappyPath(): Promise<void> {
  console.log("[llmops-obs] record/get/list happy path...");
  const store = buildStore();
  await store.record({
    id: asLlmopsObservationId("obs-b"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 2000,
    costUnits: 1.5,
  });
  await store.record({
    id: asLlmopsObservationId("obs-a"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 1000,
    quality: { hitRate: 0.9, gatePass: 1 },
    latencyMs: 42,
  });
  const listed = await store.listByWorkspace("workspace-a");
  assertEqual(
    listed.map((o) => o.id).join(","),
    "obs-a,obs-b",
    "ordered by recordedAt then id",
  );
  assertEqual(
    (await store.getById("workspace-a", asLlmopsObservationId("obs-a")))
      ?.latencyMs,
    42,
    "getById latency",
  );
}

async function assertDuplicateThrows(): Promise<void> {
  console.log("[llmops-obs] duplicate id throws...");
  const store = buildStore();
  await store.record({
    id: asLlmopsObservationId("obs-1"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 1,
    latencyMs: 1,
  });
  await assertThrowsAsync(
    () =>
      store.record({
        id: asLlmopsObservationId("obs-1"),
        workspaceId: "workspace-a",
        recordedAtUnixMs: 2,
        costUnits: 1,
      }),
    "Duplicate observation id",
  );
}

async function assertMissingSignalThrows(): Promise<void> {
  console.log("[llmops-obs] missing signal throws...");
  const store = buildStore();
  await assertThrowsAsync(
    () =>
      store.record({
        id: asLlmopsObservationId("obs-empty"),
        workspaceId: "workspace-a",
        recordedAtUnixMs: 1,
      }),
    "At least one of non-empty quality, costUnits, or latencyMs is required",
  );
  await assertThrowsAsync(
    () =>
      store.record({
        id: asLlmopsObservationId("obs-empty-q"),
        workspaceId: "workspace-a",
        recordedAtUnixMs: 1,
        quality: {},
      }),
    "At least one of non-empty quality, costUnits, or latencyMs is required",
  );
}

async function assertNegativeThrows(): Promise<void> {
  console.log("[llmops-obs] negative cost/latency throws...");
  const store = buildStore();
  await assertThrowsAsync(
    () =>
      store.record({
        id: asLlmopsObservationId("obs-neg-c"),
        workspaceId: "workspace-a",
        recordedAtUnixMs: 1,
        costUnits: -1,
      }),
    "costUnits must be a non-negative finite number",
  );
  await assertThrowsAsync(
    () =>
      store.record({
        id: asLlmopsObservationId("obs-neg-l"),
        workspaceId: "workspace-a",
        recordedAtUnixMs: 1,
        latencyMs: -1,
      }),
    "latencyMs must be a non-negative finite number",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops-obs] workspace isolation...");
  const store = buildStore();
  await store.record({
    id: asLlmopsObservationId("obs-1"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 1,
    latencyMs: 10,
  });
  await store.record({
    id: asLlmopsObservationId("obs-1"),
    workspaceId: "workspace-b",
    recordedAtUnixMs: 1,
    latencyMs: 20,
  });
  assertEqual(
    (await store.listByWorkspace("workspace-a")).length,
    1,
    "workspace-a count",
  );
  assertEqual(
    (
      await store.getById("workspace-b", asLlmopsObservationId("obs-1"))
    )?.latencyMs,
    20,
    "workspace-b isolated",
  );
}

async function assertSoftLinkFilters(): Promise<void> {
  console.log("[llmops-obs] listByExperimentRun / listByServingConfig...");
  const store = buildStore();
  await store.record({
    id: asLlmopsObservationId("obs-run"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 100,
    experimentRunId: asExperimentRunId("run-1"),
    latencyMs: 5,
  });
  await store.record({
    id: asLlmopsObservationId("obs-svc"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 200,
    servingConfigId: asServingConfigId("svc-1"),
    costUnits: 2,
  });
  await store.record({
    id: asLlmopsObservationId("obs-none"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 300,
    quality: { hitRate: 0.5 },
  });
  assertEqual(
    (
      await store.listByExperimentRun(
        "workspace-a",
        asExperimentRunId("run-1"),
      )
    )
      .map((o) => o.id)
      .join(","),
    "obs-run",
    "filter by run",
  );
  assertEqual(
    (
      await store.listByServingConfig(
        "workspace-a",
        asServingConfigId("svc-1"),
      )
    )
      .map((o) => o.id)
      .join(","),
    "obs-svc",
    "filter by serving",
  );
  assertEqual(
    (
      await store.listByExperimentRun(
        "workspace-a",
        asExperimentRunId("missing"),
      )
    ).length,
    0,
    "empty for unknown run",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops-obs] defensive copies...");
  const store = buildStore();
  const quality = { hitRate: 0.8 };
  const attributes = { model: "fake" };
  const created = await store.record({
    id: asLlmopsObservationId("obs-1"),
    workspaceId: "workspace-a",
    recordedAtUnixMs: 1,
    quality,
    attributes,
  });
  quality.hitRate = 0;
  attributes.model = "mutated";
  (created.quality as { hitRate: number }).hitRate = 0;
  (created.attributes as { model: string }).model = "mutated-returned";
  const found = await store.getById(
    "workspace-a",
    asLlmopsObservationId("obs-1"),
  );
  assertEqual(found?.quality?.hitRate, 0.8, "quality unchanged");
  assertEqual(found?.attributes?.model, "fake", "attributes unchanged");
}

async function main(): Promise<void> {
  await assertHappyPath();
  await assertDuplicateThrows();
  await assertMissingSignalThrows();
  await assertNegativeThrows();
  await assertWorkspaceIsolation();
  await assertSoftLinkFilters();
  await assertDefensiveCopies();
  console.log("LLMOps observation store validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
