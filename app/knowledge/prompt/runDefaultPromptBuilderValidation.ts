import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultPromptBuilder } from "./DefaultPromptBuilder";
import type { PromptBuilder } from "./PromptBuilder";
import type { GroundingContext, GroundingContextBlock } from "../context/GroundingContext";

const SYSTEM_INSTRUCTION =
  "You are a knowledge assistant. Answer only from the provided grounding context. If the grounding context is empty or insufficient, state that the available knowledge does not contain enough information. Do not invent facts or citations.";

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

function buildPromptBuilder(): PromptBuilder {
  return new DefaultPromptBuilder();
}

async function assertPortContract(): Promise<void> {
  console.log("[prompt] port contract (PromptBuilder)...");
  const builder = buildPromptBuilder();
  assertTruthy(typeof builder.build === "function", "build must be defined");
}

async function assertSystemInstructionIsAlwaysTheFixedString(): Promise<void> {
  console.log("[prompt] build always returns the fixed systemInstruction, regardless of context...");
  const builder = buildPromptBuilder();

  const empty = await builder.build(groundingContext());
  const nonEmpty = await builder.build(
    groundingContext({ query: "q", content: "some content", blocks: [block()] }),
  );

  assertEqual(empty.systemInstruction, SYSTEM_INSTRUCTION, "expected the fixed systemInstruction for an empty context");
  assertEqual(nonEmpty.systemInstruction, SYSTEM_INSTRUCTION, "expected the fixed systemInstruction for a non-empty context");
}

async function assertUserMessageReportsCompleteStatusAndContent(): Promise<void> {
  console.log("[prompt] build reports 'complete' status and includes verbatim content when truncated=false...");
  const builder = buildPromptBuilder();
  const context = groundingContext({
    query: "what is the policy?",
    content: "[sourceId=source-1;documentId=doc-1;chunkId=chunk-1]\npolicy text",
    blocks: [block()],
    truncated: false,
  });

  const result = await builder.build(context);

  const expected =
    "Question:\nwhat is the policy?\n\nGrounding context status: complete\n\nGrounding context:\n[sourceId=source-1;documentId=doc-1;chunkId=chunk-1]\npolicy text";
  assertEqual(result.userMessage, expected, "expected the exact fixed-format userMessage for a complete context");
}

async function assertUserMessageReportsTruncatedStatus(): Promise<void> {
  console.log("[prompt] build reports 'truncated' status when GroundingContext.truncated is true...");
  const builder = buildPromptBuilder();
  const context = groundingContext({
    query: "q",
    content: "some content",
    blocks: [block()],
    truncated: true,
  });

  const result = await builder.build(context);

  assertTruthy(
    result.userMessage.includes("Grounding context status: truncated"),
    "expected the userMessage to report a truncated status",
  );
}

async function assertUserMessageUsesNoneFallbackForEmptyContent(): Promise<void> {
  console.log("[prompt] build renders exactly '[none]' when GroundingContext.content is empty...");
  const builder = buildPromptBuilder();
  const context = groundingContext({ query: "no matches", content: "", blocks: [], truncated: false });

  const result = await builder.build(context);

  const expected = "Question:\nno matches\n\nGrounding context status: complete\n\nGrounding context:\n[none]";
  assertEqual(result.userMessage, expected, "expected the exact fixed-format userMessage with a [none] fallback for empty content");
}

async function assertBuildNeverIntroducesEvidenceOutsideContent(): Promise<void> {
  console.log("[prompt] build derives the grounding context section only from GroundingContext.content, never re-derived from blocks...");
  const builder = buildPromptBuilder();
  // content deliberately differs from what a naive re-render of `blocks`
  // would produce, so this proves the builder uses `content` verbatim.
  const context = groundingContext({
    query: "q",
    content: "exact-content-not-block-text",
    blocks: [block({ text: "different-block-text" })],
    truncated: false,
  });

  const result = await builder.build(context);

  assertTruthy(result.userMessage.includes("exact-content-not-block-text"), "expected the userMessage to include GroundingContext.content verbatim");
  assertTruthy(!result.userMessage.includes("different-block-text"), "expected the userMessage to never re-derive the grounding context section from blocks");
}

async function assertBuildIsDeterministicForRepeatedCalls(): Promise<void> {
  console.log("[prompt] build returns byte-identical output for the same input across repeated calls...");
  const builder = buildPromptBuilder();
  const context = groundingContext({
    query: "q",
    content: "some content",
    blocks: [block()],
    truncated: true,
  });

  const first = await builder.build(context);
  const second = await builder.build(context);

  assertEqual(first.systemInstruction, second.systemInstruction, "expected systemInstruction to be identical across repeated calls");
  assertEqual(first.userMessage, second.userMessage, "expected userMessage to be identical across repeated calls");
}

async function assertDoesNotMutateInput(): Promise<void> {
  console.log("[prompt] build never mutates the input GroundingContext or its blocks array/objects...");
  const builder = buildPromptBuilder();
  const originalBlock = block();
  const blocks = [originalBlock];
  const context = groundingContext({ query: "q", content: "some content", blocks, truncated: false });

  await builder.build(context);

  assertEqual(context.blocks, blocks, "expected the input's blocks array reference to be unchanged");
  assertEqual(blocks.length, 1, "expected the input's blocks array to still have exactly one entry");
  assertEqual(blocks[0], originalBlock, "expected the input's blocks array to still hold the original GroundingContextBlock reference");
  assertEqual(context.query, "q", "expected the input's query to be unmutated");
  assertEqual(context.content, "some content", "expected the input's content to be unmutated");
}

async function assertRejectsInvalidContext(): Promise<void> {
  console.log("[prompt] build rejects an invalid GroundingContext, and malformed GroundingContextBlock entries...");
  const builder = buildPromptBuilder();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ blocks: [], content: "", truncated: false }),
    "GroundingContext.query must be a string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ query: "q", blocks: [], truncated: false }),
    "GroundingContext.content must be a string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ query: "q", blocks: [], content: "" }),
    "GroundingContext.truncated must be a boolean",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ query: "q", blocks: "not-an-array", content: "", truncated: false }),
    "GroundingContext.blocks must be an array",
  );
  await assertThrowsAsync(
    () =>
      builder.build(
        groundingContext({ blocks: [block({ sourceId: " " })] }),
      ),
    "GroundingContextBlock.sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      // @ts-expect-error intentionally invalid for validation coverage
      builder.build(groundingContext({ blocks: [{ ...block(), score: "high" }] })),
    "GroundingContextBlock.score must be a finite number",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build(null),
    "GroundingContext must be an object",
  );
}

function assertDefaultPromptBuilderImportsOnlyPorts(): void {
  console.log("[prompt] DefaultPromptBuilder imports only ports, never a concrete adapter, LLM provider, or repository...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/prompt/DefaultPromptBuilder.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultContextAssembler",
    "DefaultRerankedSearch",
    "DefaultHybridSearch",
    "DefaultReranker",
    "DefaultInMemoryRepository",
    "FakeEmbeddingProvider",
    "InMemoryVectorIndex",
    "../persistence/",
    "../embedding/",
    "../repository/",
    "../search/",
    "../retrieval/",
    "../ai/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultPromptBuilder.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertSystemInstructionIsAlwaysTheFixedString();
  await assertUserMessageReportsCompleteStatusAndContent();
  await assertUserMessageReportsTruncatedStatus();
  await assertUserMessageUsesNoneFallbackForEmptyContent();
  await assertBuildNeverIntroducesEvidenceOutsideContent();
  await assertBuildIsDeterministicForRepeatedCalls();
  await assertDoesNotMutateInput();
  await assertRejectsInvalidContext();
  assertDefaultPromptBuilderImportsOnlyPorts();
  console.log("DefaultPromptBuilder validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
