import { readFileSync } from "node:fs";
import path from "node:path";

import { FakeLanguageModelProvider } from "./FakeLanguageModelProvider";
import type { LanguageModelProvider } from "./LanguageModelProvider";
import type { GroundedPrompt } from "../prompt/GroundedPrompt";

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

function groundedPrompt(overrides: Partial<GroundedPrompt> = {}): GroundedPrompt {
  return {
    systemInstruction: "a system instruction",
    userMessage: "a user message",
    ...overrides,
  };
}

function buildProvider(): LanguageModelProvider {
  return new FakeLanguageModelProvider();
}

async function assertPortContract(): Promise<void> {
  console.log("[ai] port contract (LanguageModelProvider)...");
  const provider = buildProvider();
  assertTruthy(typeof provider.generate === "function", "generate must be defined");
}

async function assertGenerateMapsUserMessageExactly(): Promise<void> {
  console.log("[ai] generate returns { text: prompt.userMessage } exactly...");
  const provider = buildProvider();
  const prompt = groundedPrompt({
    systemInstruction: "instruction",
    userMessage: "Question:\nwhat is the policy?\n\nGrounding context:\n[none]",
  });

  const result = await provider.generate(prompt);

  assertEqual(result.text, prompt.userMessage, "expected GeneratedText.text to exactly equal GroundedPrompt.userMessage");
}

async function assertGenerateHandlesEmptyUserMessage(): Promise<void> {
  console.log("[ai] generate accommodates an empty userMessage...");
  const provider = buildProvider();
  const prompt = groundedPrompt({ systemInstruction: "instruction", userMessage: "" });

  const result = await provider.generate(prompt);

  assertEqual(result.text, "", "expected GeneratedText.text to be the empty string when userMessage is empty");
}

async function assertGenerateIsDeterministicForRepeatedCalls(): Promise<void> {
  console.log("[ai] generate returns byte-identical output for the same input across repeated calls...");
  const provider = buildProvider();
  const prompt = groundedPrompt({ systemInstruction: "instruction", userMessage: "same input" });

  const first = await provider.generate(prompt);
  const second = await provider.generate(prompt);

  assertEqual(first.text, second.text, "expected text to be identical across repeated calls");
}

async function assertDoesNotMutateInputAndReturnsFreshObject(): Promise<void> {
  console.log("[ai] generate never mutates the input GroundedPrompt and returns a fresh GeneratedText object...");
  const provider = buildProvider();
  const prompt = groundedPrompt({ systemInstruction: "instruction", userMessage: "message" });
  const promptSnapshot = { ...prompt };

  const first = await provider.generate(prompt);
  const second = await provider.generate(prompt);

  assertEqual(prompt.systemInstruction, promptSnapshot.systemInstruction, "expected the input's systemInstruction to be unmutated");
  assertEqual(prompt.userMessage, promptSnapshot.userMessage, "expected the input's userMessage to be unmutated");
  assertTruthy(first !== second, "expected each call to return a fresh GeneratedText object, not a shared reference");
}

async function assertRejectsInvalidPrompt(): Promise<void> {
  console.log("[ai] generate rejects an invalid GroundedPrompt...");
  const provider = buildProvider();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => provider.generate(null),
    "GroundedPrompt must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => provider.generate({ userMessage: "message" }),
    "GroundedPrompt.systemInstruction must be a non-empty string",
  );
  await assertThrowsAsync(
    () => provider.generate(groundedPrompt({ systemInstruction: " " })),
    "GroundedPrompt.systemInstruction must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => provider.generate({ systemInstruction: "instruction" }),
    "GroundedPrompt.userMessage must be a string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => provider.generate(groundedPrompt({ userMessage: 123 })),
    "GroundedPrompt.userMessage must be a string",
  );
}

function assertFakeLanguageModelProviderImportsOnlyPorts(): void {
  console.log("[ai] FakeLanguageModelProvider imports only the prompt/ai contract types, never a real provider, model SDK, or lower-level adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/ai/FakeLanguageModelProvider.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultPromptBuilder",
    "DefaultContextAssembler",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "DefaultInMemoryRepository",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "openai",
    "anthropic",
    "fetch(",
    "http",
    "../persistence/",
    "../embedding/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../context/",
    "../prompt/PromptBuilder",
    "../prompt/DefaultPromptBuilder",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `FakeLanguageModelProvider.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertGenerateMapsUserMessageExactly();
  await assertGenerateHandlesEmptyUserMessage();
  await assertGenerateIsDeterministicForRepeatedCalls();
  await assertDoesNotMutateInputAndReturnsFreshObject();
  await assertRejectsInvalidPrompt();
  assertFakeLanguageModelProviderImportsOnlyPorts();
  console.log("FakeLanguageModelProvider validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
