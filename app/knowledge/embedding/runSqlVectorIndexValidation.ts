import { SqlVectorIndex } from "./SqlVectorIndex";
import { InMemorySqlGateway } from "../infra/InMemorySqlGateway";
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

function unitVector(oneIndex: number): number[] {
  const vector = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
  vector[oneIndex] = 1;
  return vector;
}

const ZERO_VECTOR = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);

async function assertPortContract(): Promise<void> {
  console.log("[embedding] port contract (VectorIndex)...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  assertTruthy(typeof index.upsert === "function", "upsert must be defined");
  assertTruthy(typeof index.findByChunkId === "function", "findByChunkId must be defined");
  assertTruthy(typeof index.deleteByChunkId === "function", "deleteByChunkId must be defined");
  assertTruthy(typeof index.findNearest === "function", "findNearest must be defined");
}

async function assertUpsertAndFindRoundTrip(): Promise<void> {
  console.log("[embedding] upsert + findByChunkId round trip...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector());

  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertTruthy(found !== null, "expected a stored vector to be found");
  assertEqual(found?.workspaceId, WORKSPACE_A, "found.workspaceId mismatch");
  assertEqual(found?.chunkId, "chunk-1", "found.chunkId mismatch");
  assertEqual(found?.vector.join(","), "1,2,3,4,5,6,7,8", "found.vector mismatch");
}

async function assertFindMissingReturnsNull(): Promise<void> {
  console.log("[embedding] findByChunkId returns null for a missing chunkId...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  const found = await index.findByChunkId(WORKSPACE_A, "missing-chunk");
  assertEqual(found, null, "expected null for a missing chunkId");
}

async function assertUpsertReplacesExistingVector(): Promise<void> {
  console.log("[embedding] upsert replaces the existing vector for the same (workspaceId, chunkId) identity...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ vector: [1, 1, 1, 1, 1, 1, 1, 1] }));
  await index.upsert(makeVector({ vector: [2, 2, 2, 2, 2, 2, 2, 2] }));

  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertEqual(found?.vector.join(","), "2,2,2,2,2,2,2,2", "expected the second upsert to fully replace the first");
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[embedding] the same chunkId is isolated per workspace...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ workspaceId: WORKSPACE_A, vector: [1, 1, 1, 1, 1, 1, 1, 1] }));
  await index.upsert(makeVector({ workspaceId: WORKSPACE_B, vector: [2, 2, 2, 2, 2, 2, 2, 2] }));

  const foundA = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  const foundB = await index.findByChunkId(WORKSPACE_B, "chunk-1");
  assertEqual(foundA?.vector.join(","), "1,1,1,1,1,1,1,1", "workspace A vector must be unaffected by workspace B upsert");
  assertEqual(foundB?.vector.join(","), "2,2,2,2,2,2,2,2", "workspace B vector must be unaffected by workspace A upsert");
}

async function assertDefensiveCopyOnUpsertInputAndFindOutput(): Promise<void> {
  console.log("[embedding] defensive copy on upsert input and findByChunkId output...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
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
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());

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
  await assertThrowsAsync(
    () => index.deleteByChunkId(" ", "chunk-1"),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => index.deleteByChunkId(WORKSPACE_A, " "),
    "chunkId must be a non-empty string",
  );
}

async function assertDeleteByChunkIdRemovesAndIsNoOpWhenMissing(): Promise<void> {
  console.log(
    "[embedding] deleteByChunkId removes a stored vector and is a no-op when missing...",
  );
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "to-delete" }));
  await index.deleteByChunkId(WORKSPACE_A, "to-delete");
  const afterDelete = await index.findByChunkId(WORKSPACE_A, "to-delete");
  assertEqual(afterDelete, null, "expected vector to be removed");

  await index.deleteByChunkId(WORKSPACE_A, "never-existed");
  const stillMissing = await index.findByChunkId(WORKSPACE_A, "never-existed");
  assertEqual(stillMissing, null, "expected missing delete to remain a no-op");
}

async function assertDeleteByChunkIdIsolatesByWorkspace(): Promise<void> {
  console.log(
    "[embedding] deleteByChunkId only removes the vector in the requested workspace...",
  );
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ workspaceId: WORKSPACE_A, chunkId: "shared" }));
  await index.upsert(makeVector({ workspaceId: WORKSPACE_B, chunkId: "shared" }));
  await index.deleteByChunkId(WORKSPACE_A, "shared");
  assertEqual(
    await index.findByChunkId(WORKSPACE_A, "shared"),
    null,
    "expected workspace-a vector removed",
  );
  const remaining = await index.findByChunkId(WORKSPACE_B, "shared");
  assertTruthy(remaining !== null, "expected workspace-b vector to remain");
}

async function assertRejectsWrongDimensionOrNonFiniteVector(): Promise<void> {
  console.log("[embedding] rejects a vector with the wrong dimension or a non-finite value...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());

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

async function assertFindNearestRanksByCosineSimilarityDescending(): Promise<void> {
  console.log("[embedding] findNearest ranks by cosine similarity, best-first...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "aligned", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "orthogonal", vector: unitVector(1) }));
  await index.upsert(makeVector({ chunkId: "opposite", vector: unitVector(0).map((v) => -v) }));

  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 3);
  assertEqual(results.length, 3, "expected all 3 candidates back");
  assertEqual(results[0]?.vector.chunkId, "aligned", "expected the aligned vector to rank first");
  assertEqual(results[0]?.score, 1, "expected the aligned vector's score to be 1");
  assertEqual(results[1]?.vector.chunkId, "orthogonal", "expected the orthogonal vector to rank second");
  assertEqual(results[1]?.score, 0, "expected the orthogonal vector's score to be 0");
  assertEqual(results[2]?.vector.chunkId, "opposite", "expected the opposite vector to rank last");
  assertEqual(results[2]?.score, -1, "expected the opposite vector's score to be -1");
}

async function assertFindNearestIsolatesByWorkspace(): Promise<void> {
  console.log("[embedding] findNearest only ranks vectors within the same workspace...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ workspaceId: WORKSPACE_A, chunkId: "a-chunk", vector: unitVector(0) }));
  await index.upsert(makeVector({ workspaceId: WORKSPACE_B, chunkId: "b-chunk", vector: unitVector(0) }));

  const resultsA = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(resultsA.length, 1, "expected only workspace A's vector to be ranked for workspace A");
  assertEqual(resultsA[0]?.vector.chunkId, "a-chunk", "expected workspace A's own chunk");

  const resultsEmpty = await index.findNearest("workspace-unknown", unitVector(0), 10);
  assertEqual(resultsEmpty.length, 0, "expected no results for a workspace with no vectors");
}

async function assertFindNearestBreaksTiesByChunkIdAscending(): Promise<void> {
  console.log("[embedding] findNearest breaks equal-score ties by chunkId ascending...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "chunk-b", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-a", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-c", vector: unitVector(0) }));

  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(results.map((r) => r.vector.chunkId).join(","), "chunk-a,chunk-b,chunk-c", "expected equal-score results ordered by chunkId ascending");
}

async function assertFindNearestTreatsZeroNormAsZeroScore(): Promise<void> {
  console.log("[embedding] findNearest scores a zero-norm query or candidate vector as 0...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "zero-candidate", vector: [...ZERO_VECTOR] }));
  await index.upsert(makeVector({ chunkId: "unit-candidate", vector: unitVector(0) }));

  const zeroCandidateResults = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  const zeroCandidateResult = zeroCandidateResults.find((r) => r.vector.chunkId === "zero-candidate");
  assertEqual(zeroCandidateResult?.score, 0, "expected a zero-norm candidate vector to score 0 against a non-zero query");

  const zeroQueryResults = await index.findNearest(WORKSPACE_A, [...ZERO_VECTOR], 10);
  for (const result of zeroQueryResults) {
    assertEqual(result.score, 0, `expected every candidate to score 0 against a zero-norm query (got ${result.score} for ${result.vector.chunkId})`);
  }
}

async function assertFindNearestRespectsLimit(): Promise<void> {
  console.log("[embedding] findNearest returns at most limit results...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "chunk-1", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-2", vector: unitVector(1) }));
  await index.upsert(makeVector({ chunkId: "chunk-3", vector: unitVector(2) }));

  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 1);
  assertEqual(results.length, 1, "expected findNearest to truncate to the requested limit");
  assertEqual(results[0]?.vector.chunkId, "chunk-1", "expected the single best match to be returned");
}

async function assertFindNearestReturnsDefensiveCopies(): Promise<void> {
  console.log("[embedding] findNearest returns defensive copies of stored vectors...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "chunk-1", vector: unitVector(0) }));

  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  const first = results[0];
  if (!first) {
    throw new Error("Expected a result at index 0");
  }
  first.vector.vector[0] = 999;
  first.score = -999;

  const secondResults = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(secondResults[0]?.vector.vector[0], 1, "mutating a returned vector must not affect stored state");
  assertEqual(secondResults[0]?.score, 1, "mutating a returned score must not affect a subsequent call's score");
}

async function assertFindNearestRejectsInvalidQueryVectorOrLimit(): Promise<void> {
  console.log("[embedding] findNearest rejects an invalid queryVector or limit...");
  const index: VectorIndex = new SqlVectorIndex(new InMemorySqlGateway());
  await index.upsert(makeVector({ chunkId: "chunk-1", vector: unitVector(0) }));

  await assertThrowsAsync(
    () => index.findNearest(" ", unitVector(0), 5),
    "workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => index.findNearest(WORKSPACE_A, [1, 2, 3], 5),
    `must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
  );
  await assertThrowsAsync(
    () => index.findNearest(WORKSPACE_A, [1, 2, 3, 4, 5, 6, 7, Number.NaN], 5),
    "must all be finite numbers",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => index.findNearest(WORKSPACE_A, "not-an-array", 5),
    "queryVector must be an array",
  );
  await assertThrowsAsync(
    () => index.findNearest(WORKSPACE_A, unitVector(0), 0),
    "limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => index.findNearest(WORKSPACE_A, unitVector(0), -1),
    "limit must be a positive integer",
  );
  await assertThrowsAsync(
    () => index.findNearest(WORKSPACE_A, unitVector(0), 1.5),
    "limit must be a positive integer",
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
  await assertDeleteByChunkIdRemovesAndIsNoOpWhenMissing();
  await assertDeleteByChunkIdIsolatesByWorkspace();
  await assertRejectsWrongDimensionOrNonFiniteVector();
  await assertFindNearestRanksByCosineSimilarityDescending();
  await assertFindNearestIsolatesByWorkspace();
  await assertFindNearestBreaksTiesByChunkIdAscending();
  await assertFindNearestTreatsZeroNormAsZeroScore();
  await assertFindNearestRespectsLimit();
  await assertFindNearestReturnsDefensiveCopies();
  await assertFindNearestRejectsInvalidQueryVectorOrLimit();
  console.log("SqlVectorIndex validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
