import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultGroundedAnswerAssembler } from "./DefaultGroundedAnswerAssembler";
import type { GroundedAnswerAssembler } from "./GroundedAnswerAssembler";
import type { GroundedAnswerAssemblyInput } from "./GroundedAnswerAssemblyInput";
import type { GroundingContext, GroundingContextBlock } from "../context/GroundingContext";
import type { GeneratedText } from "../ai/GeneratedText";

const INSUFFICIENT_EVIDENCE_MESSAGE =
  "The available knowledge does not contain enough information.";

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

function block(overrides: Partial<GroundingContextBlock> = {}): GroundingContextBlock {
  return {
    sourceId: "source-1",
    documentId: "doc-1",
    chunkId: "chunk-1",
    score: 0.5,
    text: "block text",
    ...overrides,
  };
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

function buildAssembler(): GroundedAnswerAssembler {
  return new DefaultGroundedAnswerAssembler();
}

async function assertPortContract(): Promise<void> {
  console.log("[rag] port contract (GroundedAnswerAssembler)...");
  const assembler = buildAssembler();
  assertTruthy(typeof assembler.assemble === "function", "assemble must be defined");
}

async function assertEmptyEvidenceShortCircuitsToInsufficientEvidence(): Promise<void> {
  console.log("[rag] assemble returns the fixed insufficient-evidence result when context.blocks is empty, discarding any given generated text...");
  const assembler = buildAssembler();
  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({ blocks: [], content: "", truncated: false }),
    generatedText: generatedText({ text: "a generated answer that must be discarded" }),
  };

  const result = await assembler.assemble(input);

  assertEqual(result.text, INSUFFICIENT_EVIDENCE_MESSAGE, "expected the fixed insufficient-evidence message");
  assertEqual(result.evidence.length, 0, "expected an empty evidence array");
  assertEqual(result.insufficientEvidence, true, "expected insufficientEvidence=true");
  assertTruthy(!result.text.includes("a generated answer"), "expected the generated text to never leak into the insufficient-evidence result");
}

async function assertEvidencePresentReturnsGeneratedTextAndEvidence(): Promise<void> {
  console.log("[rag] assemble returns generatedText.text and a copy of context.blocks as evidence when context.blocks is non-empty...");
  const assembler = buildAssembler();
  const contextBlock = block({ chunkId: "chunk-1" });
  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({ blocks: [contextBlock], content: "block text", truncated: false }),
    generatedText: generatedText({ text: "the answer is X" }),
  };

  const result = await assembler.assemble(input);

  assertEqual(result.text, "the answer is X", "expected result.text to be exactly generatedText.text");
  assertEqual(result.insufficientEvidence, false, "expected insufficientEvidence=false");
  assertEqual(result.evidence.length, 1, "expected exactly one evidence block");
  assertEqual(result.evidence[0]?.sourceId, contextBlock.sourceId, "expected evidence[0].sourceId to be preserved");
  assertEqual(result.evidence[0]?.documentId, contextBlock.documentId, "expected evidence[0].documentId to be preserved");
  assertEqual(result.evidence[0]?.chunkId, contextBlock.chunkId, "expected evidence[0].chunkId to be preserved");
  assertEqual(result.evidence[0]?.score, contextBlock.score, "expected evidence[0].score to be preserved");
  assertEqual(result.evidence[0]?.text, contextBlock.text, "expected evidence[0].text to be preserved");
}

async function assertTruncatedWithEvidenceStillReturnsGeneratedText(): Promise<void> {
  console.log("[rag] assemble treats truncated=true as unrelated to evidence absence: a truncated context with at least one block still returns generated text...");
  const assembler = buildAssembler();
  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({ blocks: [block()], content: "block text", truncated: true }),
    generatedText: generatedText({ text: "the answer despite truncation" }),
  };

  const result = await assembler.assemble(input);

  assertEqual(result.text, "the answer despite truncation", "expected generated text to be returned even when the context was truncated");
  assertEqual(result.insufficientEvidence, false, "expected insufficientEvidence=false for a truncated context that still carries a block");
  assertEqual(result.evidence.length, 1, "expected the truncated context's single block to still be present as evidence");
}

async function assertReturnsDefensiveCopiesAndDoesNotMutateInput(): Promise<void> {
  console.log("[rag] assemble never mutates the input context/generatedText and returns fresh evidence objects...");
  const assembler = buildAssembler();
  const originalBlock = block();
  const blocks = [originalBlock];
  const context = groundingContext({ blocks, content: "block text", truncated: false });
  const generated = generatedText({ text: "an answer" });

  const result = await assembler.assemble({ context, generatedText: generated });

  assertEqual(context.blocks, blocks, "expected the input's blocks array reference to be unchanged");
  assertEqual(blocks[0], originalBlock, "expected the input's blocks array to still hold the original GroundingContextBlock reference");
  assertEqual(context.query, "a query", "expected the input's query to be unmutated");
  assertEqual(generated.text, "an answer", "expected the input's generatedText.text to be unmutated");
  assertTruthy(result.evidence[0] !== originalBlock, "expected the returned evidence entries to be fresh objects, not the same references as the input blocks");
}

async function assertDeterministicForRepeatedCalls(): Promise<void> {
  console.log("[rag] assemble returns equivalent output for the same input across repeated calls...");
  const assembler = buildAssembler();
  const input: GroundedAnswerAssemblyInput = {
    context: groundingContext({ blocks: [block()], content: "block text", truncated: false }),
    generatedText: generatedText({ text: "same answer" }),
  };

  const first = await assembler.assemble(input);
  const second = await assembler.assemble(input);

  assertEqual(first.text, second.text, "expected text to be identical across repeated calls");
  assertEqual(first.insufficientEvidence, second.insufficientEvidence, "expected insufficientEvidence to be identical across repeated calls");
  assertEqual(JSON.stringify(first.evidence), JSON.stringify(second.evidence), "expected evidence to be structurally identical across repeated calls");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[rag] assemble rejects an invalid GroundedAnswerAssemblyInput, GroundingContext, GroundingContextBlock, or GeneratedText...");
  const assembler = buildAssembler();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble(null),
    "GroundedAnswerAssemblyInput must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ generatedText: generatedText() }),
    "GroundingContext must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ context: groundingContext(), generatedText: null }),
    "GeneratedText must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ context: { blocks: [], content: "", truncated: false }, generatedText: generatedText() }),
    "GroundingContext.query must be a string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ context: groundingContext({ blocks: "not-an-array" }), generatedText: generatedText() }),
    "GroundingContext.blocks must be an array",
  );
  await assertThrowsAsync(
    () =>
      assembler.assemble({
        context: groundingContext({ blocks: [block({ sourceId: " " })] }),
        generatedText: generatedText(),
      }),
    "GroundingContextBlock.sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      assembler.assemble({
        context: groundingContext(),
        // @ts-expect-error intentionally invalid for validation coverage
        generatedText: { text: 123 },
      }),
    "GeneratedText.text must be a string",
  );
}

function assertDefaultGroundedAnswerAssemblerImportsOnlyPorts(): void {
  console.log("[rag] DefaultGroundedAnswerAssembler imports only ports, never a concrete adapter, provider, or repository...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/rag/DefaultGroundedAnswerAssembler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultPromptBuilder",
    "DefaultContextAssembler",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "FakeLanguageModelProvider",
    "DefaultInMemoryRepository",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "../persistence/",
    "../embedding/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../prompt/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultGroundedAnswerAssembler.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertEmptyEvidenceShortCircuitsToInsufficientEvidence();
  await assertEvidencePresentReturnsGeneratedTextAndEvidence();
  await assertTruncatedWithEvidenceStillReturnsGeneratedText();
  await assertReturnsDefensiveCopiesAndDoesNotMutateInput();
  await assertDeterministicForRepeatedCalls();
  await assertRejectsInvalidInput();
  assertDefaultGroundedAnswerAssemblerImportsOnlyPorts();
  console.log("DefaultGroundedAnswerAssembler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
