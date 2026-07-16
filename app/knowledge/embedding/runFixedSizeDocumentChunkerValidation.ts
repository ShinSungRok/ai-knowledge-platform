import { FixedSizeDocumentChunker } from "./FixedSizeDocumentChunker";
import type { ChunkingService } from "./ChunkingService";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";

const WORKSPACE_A = "workspace-a";

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

function assertThrowsSync(fn: () => unknown, messageSubstring: string): void {
  try {
    fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error message to include "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected synchronous throw containing: ${messageSubstring}`);
}

function document(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "",
    ...overrides,
  };
}

async function assertPortContract(): Promise<void> {
  console.log("[embedding] port contract (ChunkingService)...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(10);
  assertTruthy(typeof chunker.chunk === "function", "chunk must be defined");
}

async function assertRejectsInvalidMaxChunkLength(): Promise<void> {
  console.log("[embedding] constructor rejects non-positive-integer maxChunkLength...");
  assertThrowsSync(
    () => new FixedSizeDocumentChunker(0),
    "maxChunkLength must be a positive integer",
  );
  assertThrowsSync(
    () => new FixedSizeDocumentChunker(-5),
    "maxChunkLength must be a positive integer",
  );
  assertThrowsSync(
    () => new FixedSizeDocumentChunker(1.5),
    "maxChunkLength must be a positive integer",
  );
  assertThrowsSync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => new FixedSizeDocumentChunker("10"),
    "maxChunkLength must be a positive integer",
  );
}

async function assertSplitsIntoFixedSizeChunksWithDeterministicIds(): Promise<void> {
  console.log("[embedding] chunk splits text into fixed-size, deterministically-id'd chunks...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(4);
  const doc = document({ id: "doc one", text: "abcdefghij" });

  const chunks = chunker.chunk(doc);
  assertEqual(chunks.length, 3, "expected 3 chunks for a 10-char text with maxChunkLength=4");

  assertEqual(chunks[0]?.order, 0, "chunk 0 order mismatch");
  assertEqual(chunks[0]?.text, "abcd", "chunk 0 text mismatch");
  assertEqual(chunks[1]?.order, 1, "chunk 1 order mismatch");
  assertEqual(chunks[1]?.text, "efgh", "chunk 1 text mismatch");
  assertEqual(chunks[2]?.order, 2, "chunk 2 order mismatch");
  assertEqual(chunks[2]?.text, "ij", "chunk 2 text mismatch (last, shorter chunk)");

  const expectedEncodedId = encodeURIComponent("doc one");
  assertEqual(chunks[0]?.id, `${expectedEncodedId}:chunk:0`, "chunk 0 id mismatch");
  assertEqual(chunks[1]?.id, `${expectedEncodedId}:chunk:1`, "chunk 1 id mismatch");
  assertEqual(chunks[2]?.id, `${expectedEncodedId}:chunk:2`, "chunk 2 id mismatch");

  for (const chunk of chunks) {
    assertEqual(chunk.workspaceId, WORKSPACE_A, "chunk workspaceId must match the document");
    assertEqual(chunk.documentId, "doc one", "chunk documentId must match the document id");
  }
}

async function assertSplitsByUnicodeCodePointNotUtf16Unit(): Promise<void> {
  console.log("[embedding] chunk splits by Unicode code point, never mid-surrogate-pair...");
  // Each of these emoji is a single Unicode code point but two UTF-16 code
  // units — Array.from must treat each as one indivisible unit.
  const text = "😀😁😂😃😄";
  const chunker: ChunkingService = new FixedSizeDocumentChunker(2);
  const doc = document({ id: "doc-emoji", text });

  const chunks = chunker.chunk(doc);
  assertEqual(chunks.length, 3, "expected 3 chunks for 5 code points with maxChunkLength=2");
  assertEqual(chunks[0]?.text, "😀😁", "chunk 0 must contain exactly 2 whole code points");
  assertEqual(chunks[1]?.text, "😂😃", "chunk 1 must contain exactly 2 whole code points");
  assertEqual(chunks[2]?.text, "😄", "chunk 2 must contain the remaining 1 code point");

  for (const chunk of chunks) {
    assertTruthy(
      Array.from(chunk.text).length <= 2,
      "no chunk may exceed maxChunkLength code points",
    );
  }
}

async function assertEmptyTextReturnsEmptyArray(): Promise<void> {
  console.log("[embedding] chunk returns an empty array for empty text...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(4);
  const chunks = chunker.chunk(document({ text: "" }));
  assertEqual(chunks.length, 0, "expected no chunks for empty text");
}

async function assertDeterministicAcrossRepeatedCalls(): Promise<void> {
  console.log("[embedding] chunk is deterministic across repeated calls on the same input...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(3);
  const doc = document({ id: "doc-repeat", text: "the quick brown fox" });

  const first = chunker.chunk(doc);
  const second = chunker.chunk(doc);

  assertEqual(first.length, second.length, "expected the same number of chunks across repeated calls");
  for (let i = 0; i < first.length; i += 1) {
    assertEqual(first[i]?.id, second[i]?.id, `chunk ${i} id must be identical across repeated calls`);
    assertEqual(first[i]?.order, second[i]?.order, `chunk ${i} order must be identical across repeated calls`);
    assertEqual(first[i]?.text, second[i]?.text, `chunk ${i} text must be identical across repeated calls`);
  }
}

async function assertOutputIsIndependentAcrossCalls(): Promise<void> {
  console.log("[embedding] chunk output arrays/objects are independent across calls...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(3);
  const doc = document({ id: "doc-independent", text: "abcdef" });

  const first = chunker.chunk(doc);
  const firstChunk = first[0];
  if (!firstChunk) {
    throw new Error("Expected a chunk at index 0");
  }
  firstChunk.text = "mutated";
  first.push({
    workspaceId: WORKSPACE_A,
    id: "injected",
    documentId: "doc-independent",
    text: "must not appear",
    order: 99,
  });

  const second = chunker.chunk(doc);
  assertEqual(second.length, 2, "a mutated prior result must not affect a fresh chunk() call");
  assertEqual(second[0]?.text, "abc", "a fresh chunk() call must not reflect a mutated prior chunk");
}

async function assertRejectsInvalidDocument(): Promise<void> {
  console.log("[embedding] chunk rejects an invalid document...");
  const chunker: ChunkingService = new FixedSizeDocumentChunker(4);

  assertThrowsSync(
    () => chunker.chunk(document({ workspaceId: " " })),
    "workspaceId must be a non-empty string",
  );
  assertThrowsSync(
    () => chunker.chunk(document({ id: " " })),
    "id must be a non-empty string",
  );
  assertThrowsSync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => chunker.chunk(document({ text: 123 })),
    "text must be a string",
  );
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertRejectsInvalidMaxChunkLength();
  await assertSplitsIntoFixedSizeChunksWithDeterministicIds();
  await assertSplitsByUnicodeCodePointNotUtf16Unit();
  await assertEmptyTextReturnsEmptyArray();
  await assertDeterministicAcrossRepeatedCalls();
  await assertOutputIsIndependentAcrossCalls();
  await assertRejectsInvalidDocument();
  console.log("FixedSizeDocumentChunker validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
