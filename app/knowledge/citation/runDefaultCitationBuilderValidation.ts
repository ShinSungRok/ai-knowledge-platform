import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultCitationBuilder } from "./DefaultCitationBuilder";
import type { CitationBuilder } from "./CitationBuilder";
import type { GroundedAnswer } from "../rag/GroundedAnswer";
import type { GroundingContextBlock } from "../context/GroundingContext";

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

function groundedAnswer(overrides: Partial<GroundedAnswer> = {}): GroundedAnswer {
  return {
    text: "an answer",
    evidence: [block()],
    insufficientEvidence: false,
    ...overrides,
  };
}

function expectedId(sourceId: string, documentId: string, chunkId: string): string {
  return `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`;
}

function buildBuilder(): CitationBuilder {
  return new DefaultCitationBuilder();
}

async function assertPortContract(): Promise<void> {
  console.log("[citation] port contract (CitationBuilder)...");
  const builder = buildBuilder();
  assertTruthy(typeof builder.build === "function", "build must be defined");
}

async function assertOneCitationPerEvidenceWithDeterministicId(): Promise<void> {
  console.log("[citation] build emits exactly one citation per evidence block with the deterministic id format and copied provenance/excerpt...");
  const builder = buildBuilder();
  const first = block({
    sourceId: "src/a",
    documentId: "doc:1",
    chunkId: "chunk 2",
    score: 0.91,
    text: "first evidence excerpt",
  });
  const second = block({
    sourceId: "source-2",
    documentId: "doc-2",
    chunkId: "chunk-2",
    score: 0.42,
    text: "second evidence excerpt",
  });
  const answer = groundedAnswer({ evidence: [first, second] });

  const citations = await builder.build(answer);

  assertEqual(citations.length, 2, "expected exactly one citation per evidence block");
  assertEqual(
    citations[0]?.id,
    expectedId(first.sourceId, first.documentId, first.chunkId),
    "expected citations[0].id to use encodeURIComponent over sourceId/documentId/chunkId",
  );
  assertEqual(citations[0]?.sourceId, first.sourceId, "expected citations[0].sourceId to be copied");
  assertEqual(citations[0]?.documentId, first.documentId, "expected citations[0].documentId to be copied");
  assertEqual(citations[0]?.chunkId, first.chunkId, "expected citations[0].chunkId to be copied");
  assertEqual(citations[0]?.score, first.score, "expected citations[0].score to be copied");
  assertEqual(citations[0]?.excerpt, first.text, "expected citations[0].excerpt to equal evidence text (no truncation)");
  assertEqual(
    citations[1]?.id,
    expectedId(second.sourceId, second.documentId, second.chunkId),
    "expected citations[1].id to use the deterministic id format",
  );
  assertEqual(citations[1]?.excerpt, second.text, "expected citations[1].excerpt to equal evidence text");
}

async function assertEmptyEvidenceReturnsEmptyCitations(): Promise<void> {
  console.log("[citation] build returns an empty Citation[] for an empty-evidence answer and never fabricates a citation...");
  const builder = buildBuilder();
  const answer = groundedAnswer({
    text: "The available knowledge does not contain enough information.",
    evidence: [],
    insufficientEvidence: true,
  });

  const citations = await builder.build(answer);

  assertEqual(citations.length, 0, "expected an empty Citation[] when evidence is empty");
}

async function assertPreservesEvidenceOrder(): Promise<void> {
  console.log("[citation] build preserves evidence order and never re-sorts...");
  const builder = buildBuilder();
  const answer = groundedAnswer({
    evidence: [
      block({ chunkId: "chunk-z", score: 0.1 }),
      block({ chunkId: "chunk-a", score: 0.9 }),
      block({ chunkId: "chunk-m", score: 0.5 }),
    ],
  });

  const citations = await builder.build(answer);

  assertEqual(citations.map((c) => c.chunkId).join(","), "chunk-z,chunk-a,chunk-m", "expected citation order to match evidence order");
}

async function assertReturnsDefensiveCopiesAndDoesNotMutateInput(): Promise<void> {
  console.log("[citation] build never mutates the input answer/evidence and returns fresh citation objects...");
  const builder = buildBuilder();
  const originalBlock = block();
  const evidence = [originalBlock];
  const answer = groundedAnswer({ evidence });

  const citations = await builder.build(answer);

  assertEqual(answer.evidence, evidence, "expected the input's evidence array reference to be unchanged");
  assertEqual(evidence[0], originalBlock, "expected the input's evidence array to still hold the original block reference");
  assertEqual(answer.text, "an answer", "expected the input's text to be unmutated");
  assertEqual(originalBlock.text, "block text", "expected the input block's text to be unmutated");
  assertTruthy(
    citations[0] !== (originalBlock as unknown),
    "expected the returned citation to be a fresh object, not the same reference as the evidence block",
  );
}

async function assertRejectsInvalidAnswer(): Promise<void> {
  console.log("[citation] build rejects an invalid GroundedAnswer or GroundingContextBlock...");
  const builder = buildBuilder();

  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build(null),
    "GroundedAnswer must be an object",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ evidence: [], insufficientEvidence: false }),
    "GroundedAnswer.text must be a string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ text: "x", evidence: [], insufficientEvidence: "yes" }),
    "GroundedAnswer.insufficientEvidence must be a boolean",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => builder.build({ text: "x", evidence: "not-an-array", insufficientEvidence: false }),
    "GroundedAnswer.evidence must be an array",
  );
  await assertThrowsAsync(
    () =>
      builder.build(
        groundedAnswer({ evidence: [block({ sourceId: " " })] }),
      ),
    "GroundingContextBlock.sourceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      builder.build(
        groundedAnswer({
          evidence: [block({ score: Number.NaN })],
        }),
      ),
    "GroundingContextBlock.score must be a finite number",
  );
  await assertThrowsAsync(
    () =>
      builder.build(
        groundedAnswer({
          // @ts-expect-error intentionally invalid for validation coverage
          evidence: [block({ text: 123 })],
        }),
      ),
    "GroundingContextBlock.text must be a string",
  );
}

function assertDefaultCitationBuilderImportsOnlyPorts(): void {
  console.log("[citation] DefaultCitationBuilder imports only ports/types, never a concrete adapter, provider, or repository...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/citation/DefaultCitationBuilder.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultGroundedAnswerAssembler",
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
    "../ai/",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultCitationBuilder.ts must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertOneCitationPerEvidenceWithDeterministicId();
  await assertEmptyEvidenceReturnsEmptyCitations();
  await assertPreservesEvidenceOrder();
  await assertReturnsDefensiveCopiesAndDoesNotMutateInput();
  await assertRejectsInvalidAnswer();
  assertDefaultCitationBuilderImportsOnlyPorts();
  console.log("DefaultCitationBuilder validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
