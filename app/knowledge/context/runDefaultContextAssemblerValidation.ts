import { readFileSync } from "node:fs";
import path from "node:path";

import { DefaultContextAssembler } from "./DefaultContextAssembler";
import { DefaultInMemoryRepository } from "../persistence/DefaultInMemoryRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { ContextAssembler } from "./ContextAssembler";
import type { ContextAssemblyInput } from "./ContextAssemblyInput";
import type { RetrievedChunk } from "../retrieval/RetrievalResult";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

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

/** Independently replicates DefaultContextAssembler's fixed render format, to check against without re-deriving the implementation. */
function renderExpectedBlock(
  sourceId: string,
  documentId: string,
  chunkId: string,
  text: string,
): string {
  return `[sourceId=${sourceId};documentId=${documentId};chunkId=${chunkId}]\n${text}`;
}

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "document text",
    ...overrides,
  };
}

function chunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: "doc-1",
    text: "chunk text",
    order: 0,
    ...overrides,
  };
}

function retrieved(chunkOverrides: Partial<DocumentChunk> = {}, score = 1): RetrievedChunk {
  return { chunk: chunk(chunkOverrides), score };
}

interface Harness {
  assembler: ContextAssembler;
  documentRepository: KnowledgeDocumentRepository;
}

function buildHarness(): Harness {
  const documentRepository = new DefaultInMemoryRepository();
  const assembler = new DefaultContextAssembler(documentRepository);
  return { assembler, documentRepository };
}

async function assertPortContract(): Promise<void> {
  console.log("[context] port contract (ContextAssembler)...");
  const { assembler } = buildHarness();
  assertTruthy(typeof assembler.assemble === "function", "assemble must be defined");
}

async function assertAssembleHydratesProvenanceAndPreservesRankingOrder(): Promise<void> {
  console.log("[context] assemble hydrates each block's document provenance and preserves the given ranking order (never re-sorts)...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));
  await documentRepository.save(document({ id: "doc-2", sourceId: "source-2" }));

  // Rank 1 (best match) belongs to doc-2, rank 2 to doc-1 — a lower score
  // than rank 2's — proving order is preserved from input, not re-derived
  // from score.
  const input: ContextAssemblyInput = {
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "chunk-2", documentId: "doc-2", text: "second doc text" }, 0.2),
      retrieved({ id: "chunk-1", documentId: "doc-1", text: "first doc text" }, 0.9),
    ],
    maxCharacters: 10_000,
  };

  const result = await assembler.assemble(input);

  assertEqual(result.query, "q", "expected GroundingContext.query to be carried through");
  assertEqual(result.blocks.length, 2, "expected both chunks to be included");
  assertEqual(result.blocks[0]?.chunkId, "chunk-2", "expected the input's given rank-1 chunk to be block 0, regardless of its score");
  assertEqual(result.blocks[0]?.sourceId, "source-2", "expected block 0 to be hydrated from doc-2's sourceId");
  assertEqual(result.blocks[0]?.documentId, "doc-2", "expected block 0's documentId to be preserved");
  assertEqual(result.blocks[0]?.score, 0.2, "expected block 0's score to be preserved unchanged");
  assertEqual(result.blocks[1]?.chunkId, "chunk-1", "expected the input's given rank-2 chunk to be block 1");
  assertEqual(result.blocks[1]?.sourceId, "source-1", "expected block 1 to be hydrated from doc-1's sourceId");
  assertEqual(result.truncated, false, "expected truncated=false when every candidate fit and hydrated");
}

async function assertAssembleIsolatesByWorkspace(): Promise<void> {
  console.log("[context] assemble only hydrates documents within the requested workspace, never a same-id document from a different workspace...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ workspaceId: WORKSPACE_A, id: "doc-x", sourceId: "source-a" }));
  await documentRepository.save(document({ workspaceId: WORKSPACE_B, id: "doc-x", sourceId: "source-b" }));

  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [retrieved({ id: "chunk-1", documentId: "doc-x", text: "text" })],
    maxCharacters: 10_000,
  });

  assertEqual(result.blocks.length, 1, "expected the workspace A chunk to be included");
  assertEqual(result.blocks[0]?.sourceId, "source-a", "expected hydration from workspace A's own document, never workspace B's same-id document");
}

async function assertAssembleSkipsStaleDocumentWithoutSettingTruncated(): Promise<void> {
  console.log("[context] assemble silently skips a chunk whose document no longer exists, without setting truncated...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));

  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "stale-chunk", documentId: "doc-missing", text: "orphaned" }),
      retrieved({ id: "chunk-1", documentId: "doc-1", text: "still here" }),
    ],
    maxCharacters: 10_000,
  });

  assertEqual(result.blocks.length, 1, "expected only the chunk with a still-existing document to be included");
  assertEqual(result.blocks[0]?.chunkId, "chunk-1", "expected the surviving chunk");
  assertEqual(result.truncated, false, "expected truncated=false: a stale document is excluded like it never existed, not counted as a budget truncation");
}

async function assertAssembleRendersFixedFormatJoinedByDoubleNewline(): Promise<void> {
  console.log("[context] assemble renders each block as '[sourceId=...;documentId=...;chunkId=...]\\n<text>', joined by a blank line...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));

  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "chunk-1", documentId: "doc-1", text: "first" }),
      retrieved({ id: "chunk-2", documentId: "doc-1", text: "second" }),
    ],
    maxCharacters: 10_000,
  });

  const expected =
    renderExpectedBlock("source-1", "doc-1", "chunk-1", "first") +
    "\n\n" +
    renderExpectedBlock("source-1", "doc-1", "chunk-2", "second");
  assertEqual(result.content, expected, "expected content to match the fixed rendering format exactly");
}

async function assertAssembleIncludesBlockOnlyWhenWholeBlockFitsBudget(): Promise<void> {
  console.log("[context] assemble includes a candidate block only if the whole rendered block fits the remaining budget, skipping an oversized one and continuing to evaluate later chunks...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));

  const bigText = "X".repeat(200);
  const smallText = "y";
  const renderedSmall = renderExpectedBlock("source-1", "doc-1", "chunk-small", smallText);

  // Budget fits chunk-small exactly, but not the much larger chunk-big —
  // and chunk-big is ranked ahead of chunk-small, proving evaluation
  // continues past an oversized candidate instead of stopping.
  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "chunk-big", documentId: "doc-1", text: bigText }),
      retrieved({ id: "chunk-small", documentId: "doc-1", text: smallText }),
    ],
    maxCharacters: renderedSmall.length,
  });

  assertEqual(result.blocks.length, 1, "expected only the smaller, budget-fitting block to be included");
  assertEqual(result.blocks[0]?.chunkId, "chunk-small", "expected the oversized block to be skipped and the later, smaller block still evaluated and included");
  assertEqual(result.content, renderedSmall, "expected content to contain only the included block's exact rendering");
  assertEqual(result.truncated, true, "expected truncated=true since the oversized candidate was excluded by budget");
}

async function assertAssembleSetsTruncatedWhenSecondBlockExceedsRemainingBudget(): Promise<void> {
  console.log("[context] assemble sets truncated=true when a later block would fit alone but not within the remaining budget after an earlier included block...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));

  const firstText = "first-block-text";
  const secondText = "second-block-text";
  const renderedFirst = renderExpectedBlock("source-1", "doc-1", "chunk-1", firstText);

  // Just enough budget for the first block alone — the second block
  // (even though modest in size) cannot fit once the separator and the
  // first block have already consumed the budget.
  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "chunk-1", documentId: "doc-1", text: firstText }),
      retrieved({ id: "chunk-2", documentId: "doc-1", text: secondText }),
    ],
    maxCharacters: renderedFirst.length,
  });

  assertEqual(result.blocks.length, 1, "expected only the first block to be included");
  assertEqual(result.blocks[0]?.chunkId, "chunk-1", "expected the first block to be included");
  assertEqual(result.content, renderedFirst, "expected content to be exactly the first block's rendering");
  assertEqual(result.truncated, true, "expected truncated=true since the second block was excluded by the remaining budget");
}

async function assertAssembleReturnsEmptyForEmptyChunks(): Promise<void> {
  console.log("[context] assemble returns empty blocks/content and truncated=false for an empty chunk list...");
  const { assembler } = buildHarness();

  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [],
    maxCharacters: 1000,
  });

  assertEqual(result.blocks.length, 0, "expected an empty blocks array");
  assertEqual(result.content, "", "expected empty content");
  assertEqual(result.truncated, false, "expected truncated=false: nothing was excluded because nothing was offered");
}

async function assertAssembleReturnsEmptyWhenEveryCandidateIsStaleOrOversized(): Promise<void> {
  console.log("[context] assemble returns empty blocks/content when every candidate is either stale or oversized, still setting truncated for the oversized one...");
  const { assembler, documentRepository } = buildHarness();
  await documentRepository.save(document({ id: "doc-1", sourceId: "source-1" }));

  const result = await assembler.assemble({
    workspaceId: WORKSPACE_A,
    query: "q",
    chunks: [
      retrieved({ id: "stale-chunk", documentId: "doc-missing", text: "orphaned" }),
      retrieved({ id: "oversized-chunk", documentId: "doc-1", text: "X".repeat(1000) }),
    ],
    maxCharacters: 10,
  });

  assertEqual(result.blocks.length, 0, "expected no blocks: one candidate was stale, the other oversized");
  assertEqual(result.content, "", "expected empty content");
  assertEqual(result.truncated, true, "expected truncated=true because the oversized candidate was excluded by budget");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[context] assemble rejects invalid workspaceId/query/chunks/maxCharacters input, and malformed chunk entries...");
  const { assembler } = buildHarness();

  await assertThrowsAsync(
    () => assembler.assemble({ workspaceId: " ", query: "q", chunks: [], maxCharacters: 100 }),
    "ContextAssemblyInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => assembler.assemble({ workspaceId: WORKSPACE_A, query: " ", chunks: [], maxCharacters: 100 }),
    "ContextAssemblyInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ workspaceId: WORKSPACE_A, query: "q", chunks: "not-an-array", maxCharacters: 100 }),
    "ContextAssemblyInput.chunks must be an array",
  );
  await assertThrowsAsync(
    () => assembler.assemble({ workspaceId: WORKSPACE_A, query: "q", chunks: [], maxCharacters: 0 }),
    "ContextAssemblyInput.maxCharacters must be a positive integer",
  );
  await assertThrowsAsync(
    () => assembler.assemble({ workspaceId: WORKSPACE_A, query: "q", chunks: [], maxCharacters: 1.5 }),
    "ContextAssemblyInput.maxCharacters must be a positive integer",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble({ workspaceId: WORKSPACE_A, query: "q", chunks: [{ score: 1 }], maxCharacters: 100 }),
    "RetrievedChunk.chunk must be an object",
  );
  await assertThrowsAsync(
    () =>
      assembler.assemble({
        workspaceId: WORKSPACE_A,
        query: "q",
        chunks: [{ chunk: chunk({ id: " " }), score: 1 }],
        maxCharacters: 100,
      }),
    "RetrievedChunk.chunk.id must be a non-empty string",
  );
  await assertThrowsAsync(
    () =>
      // @ts-expect-error intentionally invalid for validation coverage
      assembler.assemble({ workspaceId: WORKSPACE_A, query: "q", chunks: [{ chunk: chunk(), score: "high" }], maxCharacters: 100 }),
    "RetrievedChunk.score must be a finite number",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => assembler.assemble(null),
    "ContextAssemblyInput must be an object",
  );
}

function assertDefaultContextAssemblerImportsOnlyPorts(): void {
  console.log("[context] DefaultContextAssembler imports only ports, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/context/DefaultContextAssembler.ts",
  );
  const source = readFileSync(sourcePath, "utf8");
  const forbiddenReferences = [
    "DefaultInMemoryRepository",
    "DefaultInMemoryDocumentChunkRepository",
    "InMemoryVectorIndex",
    "FakeEmbeddingProvider",
    "DefaultVectorRetriever",
    "DefaultKeywordSearch",
    "DefaultHybridSearch",
    "../persistence",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `DefaultContextAssembler.ts must not reference concrete adapter "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertAssembleHydratesProvenanceAndPreservesRankingOrder();
  await assertAssembleIsolatesByWorkspace();
  await assertAssembleSkipsStaleDocumentWithoutSettingTruncated();
  await assertAssembleRendersFixedFormatJoinedByDoubleNewline();
  await assertAssembleIncludesBlockOnlyWhenWholeBlockFitsBudget();
  await assertAssembleSetsTruncatedWhenSecondBlockExceedsRemainingBudget();
  await assertAssembleReturnsEmptyForEmptyChunks();
  await assertAssembleReturnsEmptyWhenEveryCandidateIsStaleOrOversized();
  await assertRejectsInvalidInput();
  assertDefaultContextAssemblerImportsOnlyPorts();
  console.log("DefaultContextAssembler validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
