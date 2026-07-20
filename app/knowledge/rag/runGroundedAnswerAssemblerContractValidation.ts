import { KNOWLEDGE_MODULE_RAG } from "./index";
import type { GroundedAnswerAssembler } from "./GroundedAnswerAssembler";
import type { GroundedAnswerAssemblyInput } from "./GroundedAnswerAssemblyInput";
import type { GroundedAnswer } from "./GroundedAnswer";
import type { GroundedAnswerAssembler as TopLevelGroundedAnswerAssembler } from "../index";
import type { GroundingContext } from "../context/GroundingContext";
import type { GeneratedText } from "../ai/GeneratedText";

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
 * Minimal in-file test double proving `GroundedAnswerAssembler` is
 * implementable from just the exported contract types — no concrete
 * adapter exists yet (that is a later task). Applies a trivial
 * insufficient-evidence policy so this validation can also assert
 * type-compatibility of the `GroundedAnswer` return shape at both
 * compile time (via `tsc`) and runtime (via the assertions below).
 */
class FakeGroundedAnswerAssembler implements GroundedAnswerAssembler {
  async assemble(input: GroundedAnswerAssemblyInput): Promise<GroundedAnswer> {
    if (input.context.blocks.length === 0) {
      return { text: "insufficient evidence", evidence: [], insufficientEvidence: true };
    }
    return {
      text: input.generatedText.text,
      evidence: input.context.blocks,
      insufficientEvidence: false,
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

function generatedText(overrides: Partial<GeneratedText> = {}): GeneratedText {
  return { text: "generated text", ...overrides };
}

function assertModuleConstant(): void {
  console.log("[rag] KNOWLEDGE_MODULE_RAG constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_RAG, "app/knowledge/rag", "unexpected KNOWLEDGE_MODULE_RAG value");
}

async function assertGroundedAnswerAssemblerPortContract(): Promise<void> {
  console.log("[rag] port contract (GroundedAnswerAssembler) is implementable and callable...");
  const assembler: GroundedAnswerAssembler = new FakeGroundedAnswerAssembler();
  assertTruthy(typeof assembler.assemble === "function", "assemble must be defined");

  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({
      query: "what is the policy?",
      blocks: [
        { sourceId: "source-1", documentId: "doc-1", chunkId: "chunk-1", score: 0.9, text: "policy text" },
      ],
      content: "policy text",
      truncated: false,
    }),
    generatedText: generatedText({ text: "the policy is X" }),
  };

  const result = await assembler.assemble(input);

  assertEqual(typeof result.text, "string", "expected GroundedAnswer.text to be a string");
  assertTruthy(Array.isArray(result.evidence), "expected GroundedAnswer.evidence to be an array");
  assertEqual(typeof result.insufficientEvidence, "boolean", "expected GroundedAnswer.insufficientEvidence to be a boolean");
  assertEqual(result.insufficientEvidence, false, "expected insufficientEvidence=false when the context carried evidence");
}

async function assertGroundedAnswerAssemblerAcceptsEmptyEvidenceContext(): Promise<void> {
  console.log("[rag] GroundedAnswerAssemblyInput/GroundedAnswer types accommodate an empty-evidence GroundingContext...");
  const assembler: GroundedAnswerAssembler = new FakeGroundedAnswerAssembler();
  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({ query: "no matches", blocks: [], content: "", truncated: false }),
    generatedText: generatedText({ text: "" }),
  };

  const result = await assembler.assemble(input);

  assertEqual(result.evidence.length, 0, "expected an empty evidence array when the context carried no blocks");
  assertEqual(result.insufficientEvidence, true, "expected insufficientEvidence=true for an empty-evidence context");
}

function assertTopLevelBarrelExportsContractTypes(): void {
  console.log("[rag] top-level app/knowledge barrel re-exports the GroundedAnswerAssembler contract types...");
  // A compile-time-only check: `TopLevelGroundedAnswerAssembler` is
  // imported from `../index` (the top-level barrel) and assigned to a
  // local variable of the module-level `GroundedAnswerAssembler` type.
  // If the top-level barrel ever dropped or renamed this export, this
  // line would fail `pnpm typecheck` (there is no runtime artifact for
  // `export type`, so the check is necessarily compile-time; the
  // assertion below just gives this validation step a visible
  // runtime pass/fail line).
  const isAssignableToModuleType: GroundedAnswerAssembler | null =
    null as TopLevelGroundedAnswerAssembler | null;
  assertTruthy(isAssignableToModuleType === null, "expected the top-level and module-level GroundedAnswerAssembler types to be assignable to one another");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertGroundedAnswerAssemblerPortContract();
  await assertGroundedAnswerAssemblerAcceptsEmptyEvidenceContext();
  assertTopLevelBarrelExportsContractTypes();
  console.log("GroundedAnswerAssembler contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
