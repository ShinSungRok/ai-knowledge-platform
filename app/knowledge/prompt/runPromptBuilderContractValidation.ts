import { KNOWLEDGE_MODULE_PROMPT } from "./index";
import type { PromptBuilder } from "./PromptBuilder";
import type { GroundedPrompt } from "./GroundedPrompt";
import type { PromptBuilder as TopLevelPromptBuilder } from "../index";
import type { GroundingContext } from "../context/GroundingContext";

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
 * Minimal in-file test double proving `PromptBuilder` is implementable
 * from just the exported contract types — no concrete adapter exists yet
 * (that is a later task). Renders a trivial deterministic prompt so this
 * validation can also assert type-compatibility of the `GroundedPrompt`
 * return shape at both compile time (via `tsc`) and runtime (via the
 * assertions below).
 */
class FakePromptBuilder implements PromptBuilder {
  async build(context: GroundingContext): Promise<GroundedPrompt> {
    return {
      systemInstruction: "fake system instruction",
      userMessage: `${context.query}::${context.content}`,
    };
  }
}

function groundingContext(overrides: Partial<GroundingContext> = {}): GroundingContext {
  return {
    query: "a query",
    blocks: [],
    content: "",
    truncated: false,
    ...overrides,
  };
}

function assertModuleConstant(): void {
  console.log("[prompt] KNOWLEDGE_MODULE_PROMPT constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_PROMPT, "app/knowledge/prompt", "unexpected KNOWLEDGE_MODULE_PROMPT value");
}

async function assertPromptBuilderPortContract(): Promise<void> {
  console.log("[prompt] port contract (PromptBuilder) is implementable and callable...");
  const builder: PromptBuilder = new FakePromptBuilder();
  assertTruthy(typeof builder.build === "function", "build must be defined");

  const context = groundingContext({
    query: "what is the policy?",
    blocks: [
      { sourceId: "source-1", documentId: "doc-1", chunkId: "chunk-1", score: 0.9, text: "policy text" },
    ],
    content: "policy text",
    truncated: false,
  });

  const result = await builder.build(context);

  assertEqual(typeof result.systemInstruction, "string", "expected GroundedPrompt.systemInstruction to be a string");
  assertEqual(typeof result.userMessage, "string", "expected GroundedPrompt.userMessage to be a string");
  assertTruthy(result.userMessage.includes("what is the policy?"), "expected the fake builder's userMessage to reflect the given context's query");
}

async function assertPromptBuilderAcceptsEmptyContext(): Promise<void> {
  console.log("[prompt] PromptBuilder/GroundedPrompt types accommodate an empty GroundingContext...");
  const builder: PromptBuilder = new FakePromptBuilder();
  const context = groundingContext({ query: "no matches", blocks: [], content: "", truncated: false });

  const result = await builder.build(context);

  assertEqual(typeof result.systemInstruction, "string", "expected a systemInstruction even for an empty context");
  assertEqual(typeof result.userMessage, "string", "expected a userMessage even for an empty context");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[prompt] top-level app/knowledge barrel re-exports the PromptBuilder contract types...");
  // A compile-time-only check: `TopLevelPromptBuilder` is imported from
  // `../index` (the top-level barrel) and assigned to a local variable of
  // the module-level `PromptBuilder` type. If the top-level barrel ever
  // dropped or renamed this export, this line would fail `pnpm typecheck`
  // (there is no runtime artifact for `export type`, so the check is
  // necessarily compile-time; the assertion below just gives this
  // validation step a visible runtime pass/fail line).
  const isAssignableToModuleType: PromptBuilder | null = null as TopLevelPromptBuilder | null;
  assertTruthy(isAssignableToModuleType === null, "expected the top-level and module-level PromptBuilder types to be assignable to one another");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertPromptBuilderPortContract();
  await assertPromptBuilderAcceptsEmptyContext();
  assertTopLevelBarrelExportsContractTypes();
  console.log("PromptBuilder contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
