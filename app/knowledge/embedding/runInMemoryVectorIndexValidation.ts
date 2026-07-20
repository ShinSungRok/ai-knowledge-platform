import { InMemoryVectorIndex } from "./InMemoryVectorIndex";
import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { VectorIndex } from "./VectorIndex";
import type { EmbeddingVector } from "./EmbeddingVector";

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

function makeVector(overrides: Partial<EmbeddingVector> = {}): EmbeddingVector {
  return {
    workspaceId: WORKSPACE_A,
    chunkId: "chunk-1",
    vector: [1, 2, 3, 4, 5, 6, 7, 8],
    ...overrides,
  };
}

async function assertPortContract(): Promise<void> {
  console.log("[embedding] port contract (VectorIndex)...");
  const index: VectorIndex = new InMemoryVectorIndex();
  assertTruthy(typeof index.upsert === "function", "upsert must be defined");
  assertTruthy(typeof index.findByChunkId === "function", "findByChunkId must be defined");
}

async function assertUpsertAndFindRoundTrip(): Promise<void> {
  console.log("[embedding] upsert + findByChunkId round trip...");
  const index: VectorIndex = new InMemoryVectorIndex();
  await index.upsert(makeVector());

  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertTruthy(found !== null, "expected a stored vector to be found");
  assertEqual(found?.workspaceId, WORKSPACE_A, "found.workspaceId mismatch");
  assertEqual(found?.chunkId, "chunk-1", "found.chunkId mismatch");
  assertEqual(found?.vector.join(","), "1,2,3,4,5,6,7,8", "found.vector mismatch");
}

async function assertFindMissingReturnsNull(): Promise<void> {
  console.log("[embedding] findByChunkId returns null for a missing chunkId...");
  const index: VectorIndex = new InMemoryVectorIndex();
  const found = await index.findByChunkId(WORKSPACE_A, "missing-chunk");
  assertEqual(found, null, "expected null for a missing chunkId");
}

async function assertUpsertReplacesExistingVector(): Promise<void> {
  console.log("[embedding] upsert replaces the existing vector for the same (workspaceId, chunkId) identity...");
  const index: VectorIndex = new InMemoryVectorIndex();
  await index.upsert(makeVector({ vector: [1, 1, 1, 1, 1, 1, 1, 1] }));
  await index.upsert(makeVector({ vector: [2, 2, 2, 2, 2, 2, 2, 2] }));

  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertEqual(found?.vector.join(","), "2,2,2,2,2,2,2,2", "expected the second upsert to fully replace the first");
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[embedding] the same chunkId is isolated per workspace...");
  const index: VectorIndex = new InMemoryVectorIndex();
  await index.upsert(makeVector({ workspaceId: WORKSPACE_A, vector: [1, 1, 1, 1, 1, 1, 1, 1] }));
  await index.upsert(makeVector({ workspaceId: WORKSPACE_B, vector: [2, 2, 2, 2, 2, 2, 2, 2] }));

  const foundA = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  const foundB = await index.findByChunkId(WORKSPACE_B, "chunk-1");
  assertEqual(foundA?.vector.join(","), "1,1,1,1,1,1,1,1", "workspace A vector must be unaffected by workspace B upsert");
  assertEqual(foundB?.vector.join(","), "2,2,2,2,2,2,2,2", "workspace B vector must be unaffected by workspace A upsert");
}

async function assertDefensiveCopyOnUpsertInputAndFindOutput(): Promise<void> {
  console.log("[embedding] defensive copy on upsert input and findByChunkId output...");
  const index: VectorIndex = new InMemoryVectorIndex();
  const input = makeVector({ chunkId: "chunk-defensive", vector: [1, 2, 3, 4, 5, 6, 7, 8] });
  await index.upsert(input);

  input.vector[0] = 999;
  const afterInputMutation = await index.findByChunkId(WORKSPACE_A, "chunk-defensive");
  assertEqual(afterInputMutation?.vector[0], 1, "mutating the upsert input after the call must not affect stored state");

  const firstRead = await index.findByChunkId(WORKSPACE_A, "chunk-defensive");
  if (!firstRead) {
    throw new Error("Expected a stored vector for chunk-defensive");
  }
  firstRead.vector[0] = 888;
  const secondRead = await index.findByChunkId(WORKSPACE_A, "chunk-defensive");
  assertEqual(secondRead?.vector[0], 1, "mutating a read result must not affect a subsequent read");
}

async function assertRejectsEmptyWorkspaceIdOrChunkId(): Promise<void> {
  console.log("[embedding] rejects an empty workspaceId or chunkId...");
  const index: VectorIndex = new InMemoryVectorIndex();

  await assertThrowsAsync(
    () => index.upsert(makeVector({ workspaceId: " " })),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => index.upsert(makeVector({ chunkId: " " })),
    "chunkId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => index.findByChunkId(" ", "chunk-1"),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => index.findByChunkId(WORKSPACE_A, " "),
    "chunkId must be a non-empty string",
  );
}

async function assertRejectsWrongDimensionOrNonFiniteVector(): Promise<void> {
  console.log("[embedding] rejects a vector with the wrong dimension or a non-finite value...");
  const index: VectorIndex = new InMemoryVectorIndex();

  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3] })),
    `must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
  );
  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3, 4, 5, 6, 7, 8, 9] })),
    `must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
  );
  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3, 4, 5, 6, 7, Number.NaN] })),
    "must all be finite numbers",
  );
  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3, 4, 5, 6, 7, Number.POSITIVE_INFINITY] })),
    "must all be finite numbers",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => index.upsert(makeVector({ vector: "not-an-array" })),
    "must be an array",
  );
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertUpsertAndFindRoundTrip();
  await assertFindMissingReturnsNull();
  await assertUpsertReplacesExistingVector();
  await assertWorkspaceIsolation();
  await assertDefensiveCopyOnUpsertInputAndFindOutput();
  await assertRejectsEmptyWorkspaceIdOrChunkId();
  await assertRejectsWrongDimensionOrNonFiniteVector();
  console.log("InMemoryVectorIndex validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
