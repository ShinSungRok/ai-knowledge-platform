import { KNOWLEDGE_MODULE_AI } from "./index";
import type { LanguageModelProvider } from "./LanguageModelProvider";
import type { GeneratedText } from "./GeneratedText";
import type { LanguageModelProvider as TopLevelLanguageModelProvider } from "../index";
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

/**
 * Minimal in-file test double proving `LanguageModelProvider` is
 * implementable from just the exported contract types — no concrete
 * adapter exists yet (that is a later task). Echoes the prompt's
 * `userMessage` so this validation can also assert type-compatibility
 * of the `GeneratedText` return shape at both compile time (via `tsc`)
 * and runtime (via the assertions below).
 */
class FakeLanguageModelProviderDouble implements LanguageModelProvider {
  async generate(prompt: GroundedPrompt): Promise<GeneratedText> {
    return { text: prompt.userMessage };
  }
}

function groundedPrompt(overrides: Partial<GroundedPrompt> = {}): GroundedPrompt {
  return {
    systemInstruction: "a system instruction",
    userMessage: "a user message",
    ...overrides,
  };
}

function assertModuleConstant(): void {
  console.log("[ai] KNOWLEDGE_MODULE_AI constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_AI, "app/knowledge/ai", "unexpected KNOWLEDGE_MODULE_AI value");
}

async function assertLanguageModelProviderPortContract(): Promise<void> {
  console.log("[ai] port contract (LanguageModelProvider) is implementable and callable...");
  const provider: LanguageModelProvider = new FakeLanguageModelProviderDouble();
  assertTruthy(typeof provider.generate === "function", "generate must be defined");

  const prompt = groundedPrompt({
    systemInstruction: "You are a knowledge assistant.",
    userMessage: "Question:\nwhat is the policy?",
  });

  const result = await provider.generate(prompt);

  assertEqual(typeof result.text, "string", "expected GeneratedText.text to be a string");
  assertTruthy(result.text.includes("what is the policy?"), "expected the fake provider's text to reflect the given prompt's userMessage");
}

async function assertLanguageModelProviderAcceptsValidGroundedPrompt(): Promise<void> {
  console.log("[ai] LanguageModelProvider/GeneratedText types accommodate a valid GroundedPrompt...");
  const provider: LanguageModelProvider = new FakeLanguageModelProviderDouble();
  const prompt = groundedPrompt({ systemInstruction: "instruction", userMessage: "" });

  const result = await provider.generate(prompt);

  assertEqual(typeof result.text, "string", "expected a text field even for an empty userMessage");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[ai] top-level app/knowledge barrel re-exports the LanguageModelProvider contract types...");
  // A compile-time-only check: `TopLevelLanguageModelProvider` is
  // imported from `../index` (the top-level barrel) and assigned to a
  // local variable of the module-level `LanguageModelProvider` type. If
  // the top-level barrel ever dropped or renamed this export, this line
  // would fail `pnpm typecheck` (there is no runtime artifact for
  // `export type`, so the check is necessarily compile-time; the
  // assertion below just gives this validation step a visible
  // runtime pass/fail line).
  const isAssignableToModuleType: LanguageModelProvider | null =
    null as TopLevelLanguageModelProvider | null;
  assertTruthy(isAssignableToModuleType === null, "expected the top-level and module-level LanguageModelProvider types to be assignable to one another");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertLanguageModelProviderPortContract();
  await assertLanguageModelProviderAcceptsValidGroundedPrompt();
  assertTopLevelBarrelExportsContractTypes();
  console.log("LanguageModelProvider contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
