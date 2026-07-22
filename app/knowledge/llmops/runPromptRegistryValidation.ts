import { asPromptTemplateId } from "./PromptTemplateId";
import { asPromptVersionId } from "./PromptVersionId";
import { InMemoryPromptRegistry } from "./InMemoryPromptRegistry";
import type { PromptRegistry } from "./PromptRegistry";

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

function buildRegistry(): PromptRegistry {
  return new InMemoryPromptRegistry();
}

async function assertHappyPath(): Promise<void> {
  console.log("[llmops-prompt] register/get/list happy path...");
  const registry = buildRegistry();
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-b"),
    workspaceId: "workspace-a",
    name: "beta",
  });
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-a"),
    workspaceId: "workspace-a",
    name: "alpha",
  });
  const listed = await registry.listTemplates("workspace-a");
  assertEqual(
    listed.map((t) => t.id).join(","),
    "tpl-a,tpl-b",
    "templates ordered by name then id",
  );

  await registry.registerVersion({
    id: asPromptVersionId("pv-2"),
    templateId: asPromptTemplateId("tpl-a"),
    workspaceId: "workspace-a",
    version: "1.1.0",
    body: "Hello {{q}}",
  });
  await registry.registerVersion({
    id: asPromptVersionId("pv-1"),
    templateId: asPromptTemplateId("tpl-a"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    body: "Hi {{q}}",
  });
  const versions = await registry.listVersions(
    "workspace-a",
    asPromptTemplateId("tpl-a"),
  );
  assertEqual(
    versions.map((v) => v.version).join(","),
    "1.0.0,1.1.0",
    "versions ordered by version then id",
  );
  assertEqual(
    (await registry.getVersion("workspace-a", asPromptVersionId("pv-1")))?.body,
    "Hi {{q}}",
    "getVersion body",
  );
}

async function assertDuplicatesThrow(): Promise<void> {
  console.log("[llmops-prompt] duplicate id / version throws...");
  const registry = buildRegistry();
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-a",
    name: "main",
  });
  await assertThrowsAsync(
    () =>
      registry.registerTemplate({
        id: asPromptTemplateId("tpl-1"),
        workspaceId: "workspace-a",
        name: "other",
      }),
    "Duplicate prompt template id",
  );
  await registry.registerVersion({
    id: asPromptVersionId("pv-1"),
    templateId: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    body: "body",
  });
  await assertThrowsAsync(
    () =>
      registry.registerVersion({
        id: asPromptVersionId("pv-2"),
        templateId: asPromptTemplateId("tpl-1"),
        workspaceId: "workspace-a",
        version: "1.0.0",
        body: "other",
      }),
    "Duplicate prompt version string",
  );
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[llmops-prompt] workspace isolation...");
  const registry = buildRegistry();
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-a",
    name: "a",
  });
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-b",
    name: "b",
  });
  assertEqual(
    (await registry.listTemplates("workspace-a")).length,
    1,
    "workspace-a count",
  );
  assertEqual(
    (await registry.getTemplate("workspace-b", asPromptTemplateId("tpl-1")))
      ?.name,
    "b",
    "workspace-b isolated",
  );
}

async function assertDefensiveCopies(): Promise<void> {
  console.log("[llmops-prompt] defensive copies...");
  const registry = buildRegistry();
  await registry.registerTemplate({
    id: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-a",
    name: "main",
  });
  const metadata = { author: "test" };
  const version = await registry.registerVersion({
    id: asPromptVersionId("pv-1"),
    templateId: asPromptTemplateId("tpl-1"),
    workspaceId: "workspace-a",
    version: "1.0.0",
    body: "body",
    metadata,
  });
  metadata.author = "mutated-input";
  (version.metadata as { author: string }).author = "mutated-returned";
  const found = await registry.getVersion(
    "workspace-a",
    asPromptVersionId("pv-1"),
  );
  assertEqual(found?.metadata?.author, "test", "metadata unchanged in store");
}

async function main(): Promise<void> {
  await assertHappyPath();
  await assertDuplicatesThrow();
  await assertWorkspaceIsolation();
  await assertDefensiveCopies();
  console.log("Prompt registry validation succeeded.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
