import { asModelId } from "./ModelId";
import { asModelVersionId } from "./ModelVersionId";
import { InMemoryModelRegistry } from "./InMemoryModelRegistry";
import type { ModelRegistry } from "./ModelRegistry";

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

function buildRegistry(): ModelRegistry {
  return new InMemoryModelRegistry();
}

async function assertHappyPath(): Promise<void> {
  console.log("[llmops-model] register/get/list happy path...");
  const registry = buildRegistry();
  await registry.registerModel({
    id: asModelId("mdl-b"),
    workspaceId: "workspace-a",
    name: "beta",
  });
  await registry.registerModel({
    id: asModelId("mdl-a"),
    workspaceId: "workspace-a",
    name: "alpha",
  });
  const listed = await registry.listModels("workspace-a");
  assertEqual(
    listed.map((m) => m.id).join(","),
    "mdl-a,mdl-b",
    "models ordered by name then id",
  );

  await registry.registerVersion({
    id: asModelVersionId("mv-2"),
    modelId: asModelId("mdl-a"),
    workspaceId: "workspace-a",
    version: "2.0.0",
    providerModel: "gpt-fake-2",
  });
  await registry.registerVersion({
    id: asModelVersionId("mv-1"),
    modelId: asModelId("mdl-a"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    providerModel: "gpt-fake-1",
  });
  const versions = await registry.listVersions(
    "workspace-a",
    asModelId("mdl-a"),
  );
  assertEqual(
    versions.map((v) => v.version).join(","),
    "1.0.0,2.0.0",
    "versions ordered by version then id",
  );
  assertEqual(
    (
      await registry.getVersion("workspace-a", asModelVersionId("mv-1"))
    )?.providerModel,
    "gpt-fake-1",
    "getVersion providerModel",
  );
}

async function assertDuplicatesThrow(): Promise<void> {
  console.log("[llmops-model] duplicate id / version throws...");
  const registry = buildRegistry();
  await registry.registerModel({
    id: asModelId("mdl-1"),
    workspaceId: "workspace-a",
    name: "main",
  });
  await assertThrowsAsync(
    () =>
      registry.registerModel({
        id: asModelId("mdl-1"),
        workspaceId: "workspace-a",
        name: "other",
      }),
    "Duplicate model id",
  );
  await registry.registerVersion({
    id: asModelVersionId("mv-1"),
    modelId: asModelId("mdl-1"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    providerModel: "gpt-fake",
  });
  await assertThrowsAsync(
    () =>
      registry.registerVersion({
        id: asModelVersionId("mv-2"),
        modelId: asModelId("mdl-1"),
        workspaceId: "workspace-a",
        version: "1.0.0",
        providerModel: "other",
      }),
    "Duplicate model version string",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops-model] workspace isolation...");
  const registry = buildRegistry();
  await registry.registerModel({
    id: asModelId("mdl-1"),
    workspaceId: "workspace-a",
    name: "a",
  });
  await registry.registerModel({
    id: asModelId("mdl-1"),
    workspaceId: "workspace-b",
    name: "b",
  });
  assertEqual(
    (await registry.listModels("workspace-a")).length,
    1,
    "workspace-a count",
  );
  assertEqual(
    (await registry.getModel("workspace-b", asModelId("mdl-1")))?.name,
    "b",
    "workspace-b isolated",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops-model] defensive copies...");
  const registry = buildRegistry();
  await registry.registerModel({
    id: asModelId("mdl-1"),
    workspaceId: "workspace-a",
    name: "main",
  });
  const metadata = { region: "us" };
  const version = await registry.registerVersion({
    id: asModelVersionId("mv-1"),
    modelId: asModelId("mdl-1"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    providerModel: "gpt-fake",
    metadata,
  });
  metadata.region = "mutated-input";
  (version.metadata as { region: string }).region = "mutated-returned";
  const found = await registry.getVersion(
    "workspace-a",
    asModelVersionId("mv-1"),
  );
  assertEqual(found?.metadata?.region, "us", "metadata unchanged in store");
}

async function main(): Promise<void> {
  await assertHappyPath();
  await assertDuplicatesThrow();
  await assertWorkspaceIsolation();
  await assertDefensiveCopies();
  console.log("Model registry validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
