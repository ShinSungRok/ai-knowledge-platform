import { KNOWLEDGE_MODULE_CONFIG } from "./index";
import { DEFAULT_KNOWLEDGE_RUNTIME_CONFIG } from "./DEFAULT_KNOWLEDGE_RUNTIME_CONFIG";
import type { KnowledgeRuntimeConfig } from "./KnowledgeRuntimeConfig";
import { loadKnowledgeRuntimeConfig } from "./loadKnowledgeRuntimeConfig";
import type { KnowledgeRuntimeConfig as TopLevelConfig } from "../index";
import { DEFAULT_KNOWLEDGE_RUNTIME_CONFIG as TopLevelDefault } from "../index";
import { loadKnowledgeRuntimeConfig as topLevelLoad } from "../index";

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

function assertThrows(fn: () => unknown, messageIncludes: string): void {
  try {
    fn();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageIncludes),
      `expected error to include "${messageIncludes}", got "${text}"`,
    );
    return;
  }
  throw new Error(`expected throw including "${messageIncludes}"`);
}

function assertModuleConstant(): void {
  console.log(
    "[config] KNOWLEDGE_MODULE_CONFIG constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_CONFIG,
    "app/knowledge/config",
    "unexpected KNOWLEDGE_MODULE_CONFIG value",
  );
}

function assertDefaultConstant(): void {
  console.log("[config] DEFAULT_KNOWLEDGE_RUNTIME_CONFIG has expected values...");
  assertEqual(
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.defaultRetrievalLimit,
    5,
    "defaultRetrievalLimit",
  );
  assertEqual(
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.defaultMaxCharacters,
    2000,
    "defaultMaxCharacters",
  );
  assertEqual(
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.defaultToolTimeoutMs,
    1000,
    "defaultToolTimeoutMs",
  );
  assertEqual(
    DEFAULT_KNOWLEDGE_RUNTIME_CONFIG.maxChunkLength,
    200,
    "maxChunkLength",
  );
}

function assertValidLoad(): void {
  console.log("[config] loadKnowledgeRuntimeConfig accepts a valid plain object...");
  const loaded = loadKnowledgeRuntimeConfig({
    defaultRetrievalLimit: 7,
    defaultMaxCharacters: 1500,
    defaultToolTimeoutMs: 2500,
    maxChunkLength: 128,
  });
  assertEqual(loaded.defaultRetrievalLimit, 7, "loaded retrieval limit");
  assertEqual(loaded.defaultMaxCharacters, 1500, "loaded max characters");
  assertEqual(loaded.defaultToolTimeoutMs, 2500, "loaded tool timeout");
  assertEqual(loaded.maxChunkLength, 128, "loaded max chunk length");
}

function assertDefensiveCopy(): void {
  console.log(
    "[config] loadKnowledgeRuntimeConfig returns a defensive copy...",
  );
  const raw = {
    defaultRetrievalLimit: 3,
    defaultMaxCharacters: 900,
    defaultToolTimeoutMs: 400,
    maxChunkLength: 64,
  };
  const loaded = loadKnowledgeRuntimeConfig(raw);
  raw.defaultRetrievalLimit = 999;
  assertEqual(loaded.defaultRetrievalLimit, 3, "mutation of raw must not affect result");
  (loaded as { defaultRetrievalLimit: number }).defaultRetrievalLimit = 1;
  const again = loadKnowledgeRuntimeConfig({
    defaultRetrievalLimit: 3,
    defaultMaxCharacters: 900,
    defaultToolTimeoutMs: 400,
    maxChunkLength: 64,
  });
  assertEqual(again.defaultRetrievalLimit, 3, "fresh load independent");
}

function assertRejectsInvalid(): void {
  console.log("[config] loadKnowledgeRuntimeConfig rejects invalid input...");
  assertThrows(() => loadKnowledgeRuntimeConfig(null), "plain object");
  assertThrows(() => loadKnowledgeRuntimeConfig([]), "plain object");
  assertThrows(
    () =>
      loadKnowledgeRuntimeConfig({
        defaultRetrievalLimit: 0,
        defaultMaxCharacters: 2000,
        defaultToolTimeoutMs: 1000,
        maxChunkLength: 200,
      }),
    "defaultRetrievalLimit must be a positive integer",
  );
  assertThrows(
    () =>
      loadKnowledgeRuntimeConfig({
        defaultRetrievalLimit: 5,
        defaultMaxCharacters: 1.5,
        defaultToolTimeoutMs: 1000,
        maxChunkLength: 200,
      }),
    "defaultMaxCharacters must be a positive integer",
  );
}

function assertTopLevelBarrelExports(): void {
  console.log(
    "[config] top-level app/knowledge barrel re-exports config contract...",
  );
  const assignable: KnowledgeRuntimeConfig | null = null as TopLevelConfig | null;
  assertTruthy(assignable === null, "KnowledgeRuntimeConfig assignable");
  assertEqual(
    TopLevelDefault.defaultRetrievalLimit,
    5,
    "top-level default constant",
  );
  const loaded = topLevelLoad({
    defaultRetrievalLimit: 2,
    defaultMaxCharacters: 100,
    defaultToolTimeoutMs: 50,
    maxChunkLength: 40,
  });
  assertEqual(loaded.defaultRetrievalLimit, 2, "top-level load");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertDefaultConstant();
  assertValidLoad();
  assertDefensiveCopy();
  assertRejectsInvalid();
  assertTopLevelBarrelExports();
  console.log("KnowledgeRuntimeConfig validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
