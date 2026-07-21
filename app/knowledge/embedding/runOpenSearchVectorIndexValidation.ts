import { FakeOpenSearchHttpTransport } from "./FakeOpenSearchHttpTransport";
import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import { OpenSearchVectorIndex } from "./OpenSearchVectorIndex";
import type { EmbeddingVector } from "./EmbeddingVector";
import type { VectorIndex } from "./VectorIndex";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";

const DEFAULT_CONFIG = {
  baseUrl: "http://opensearch.test",
  indexName: "knowledge-embeddings",
};

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

function makeIndex(): VectorIndex {
  return new OpenSearchVectorIndex(
    DEFAULT_CONFIG,
    new FakeOpenSearchHttpTransport(),
  );
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
  console.log("[embedding] OpenSearch VectorIndex port contract...");
  const index = makeIndex();
  assertTruthy(typeof index.upsert === "function", "upsert");
  assertTruthy(typeof index.findByChunkId === "function", "findByChunkId");
  assertTruthy(typeof index.deleteByChunkId === "function", "deleteByChunkId");
  assertTruthy(typeof index.findNearest === "function", "findNearest");
}

async function assertUpsertAndFindRoundTrip(): Promise<void> {
  console.log("[embedding] OpenSearch upsert + findByChunkId round trip...");
  const index = makeIndex();
  await index.upsert(makeVector());
  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertTruthy(found !== null, "expected stored vector");
  assertEqual(found?.workspaceId, WORKSPACE_A, "workspaceId");
  assertEqual(found?.chunkId, "chunk-1", "chunkId");
  assertEqual(found?.vector.join(","), "1,2,3,4,5,6,7,8", "vector");
}

async function assertFindMissingReturnsNull(): Promise<void> {
  console.log("[embedding] OpenSearch findByChunkId missing → null...");
  const index = makeIndex();
  assertEqual(await index.findByChunkId(WORKSPACE_A, "missing-chunk"), null, "null");
}

async function assertUpsertReplacesExistingVector(): Promise<void> {
  console.log("[embedding] OpenSearch upsert replaces existing...");
  const index = makeIndex();
  await index.upsert(makeVector({ vector: [1, 1, 1, 1, 1, 1, 1, 1] }));
  await index.upsert(makeVector({ vector: [2, 2, 2, 2, 2, 2, 2, 2] }));
  const found = await index.findByChunkId(WORKSPACE_A, "chunk-1");
  assertEqual(found?.vector.join(","), "2,2,2,2,2,2,2,2", "replaced");
}

async function assertWorkspaceIsolation(): Promise<void> {
  console.log("[embedding] OpenSearch workspace isolation...");
  const index = makeIndex();
  await index.upsert(
    makeVector({ workspaceId: WORKSPACE_A, vector: [1, 1, 1, 1, 1, 1, 1, 1] }),
  );
  await index.upsert(
    makeVector({ workspaceId: WORKSPACE_B, vector: [2, 2, 2, 2, 2, 2, 2, 2] }),
  );
  assertEqual(
    (await index.findByChunkId(WORKSPACE_A, "chunk-1"))?.vector.join(","),
    "1,1,1,1,1,1,1,1",
    "A",
  );
  assertEqual(
    (await index.findByChunkId(WORKSPACE_B, "chunk-1"))?.vector.join(","),
    "2,2,2,2,2,2,2,2",
    "B",
  );
}

async function assertDefensiveCopyOnUpsertInputAndFindOutput(): Promise<void> {
  console.log("[embedding] OpenSearch defensive copies...");
  const index = makeIndex();
  const input = makeVector({
    chunkId: "chunk-defensive",
    vector: [1, 2, 3, 4, 5, 6, 7, 8],
  });
  await index.upsert(input);
  input.vector[0] = 999;
  assertEqual(
    (await index.findByChunkId(WORKSPACE_A, "chunk-defensive"))?.vector[0],
    1,
    "input mutation",
  );
  const firstRead = await index.findByChunkId(WORKSPACE_A, "chunk-defensive");
  if (!firstRead) {
    throw new Error("expected stored");
  }
  firstRead.vector[0] = 888;
  assertEqual(
    (await index.findByChunkId(WORKSPACE_A, "chunk-defensive"))?.vector[0],
    1,
    "output mutation",
  );
}

async function assertRejectsEmptyWorkspaceIdOrChunkId(): Promise<void> {
  console.log("[embedding] OpenSearch rejects empty ids...");
  const index = makeIndex();
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
    () => index.deleteByChunkId(WORKSPACE_A, " "),
    "chunkId must be a non-empty string",
  );
}

async function assertDeleteByChunkIdRemovesAndIsNoOpWhenMissing(): Promise<void> {
  console.log("[embedding] OpenSearch delete + missing no-op...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "to-delete" }));
  await index.deleteByChunkId(WORKSPACE_A, "to-delete");
  assertEqual(await index.findByChunkId(WORKSPACE_A, "to-delete"), null, "deleted");
  await index.deleteByChunkId(WORKSPACE_A, "never-existed");
  assertEqual(
    await index.findByChunkId(WORKSPACE_A, "never-existed"),
    null,
    "noop",
  );
}

async function assertDeleteByChunkIdIsolatesByWorkspace(): Promise<void> {
  console.log("[embedding] OpenSearch delete isolates workspace...");
  const index = makeIndex();
  await index.upsert(makeVector({ workspaceId: WORKSPACE_A, chunkId: "shared" }));
  await index.upsert(makeVector({ workspaceId: WORKSPACE_B, chunkId: "shared" }));
  await index.deleteByChunkId(WORKSPACE_A, "shared");
  assertEqual(await index.findByChunkId(WORKSPACE_A, "shared"), null, "A gone");
  assertTruthy(
    (await index.findByChunkId(WORKSPACE_B, "shared")) !== null,
    "B remains",
  );
}

async function assertRejectsWrongDimensionOrNonFiniteVector(): Promise<void> {
  console.log("[embedding] OpenSearch rejects bad vectors...");
  const index = makeIndex();
  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3] })),
    `must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
  );
  await assertThrowsAsync(
    () => index.upsert(makeVector({ vector: [1, 2, 3, 4, 5, 6, 7, Number.NaN] })),
    "must all be finite numbers",
  );
}

async function assertFindNearestRanksByCosineSimilarityDescending(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest cosine ranking...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "aligned", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "orthogonal", vector: unitVector(1) }));
  await index.upsert(
    makeVector({ chunkId: "opposite", vector: unitVector(0).map((v) => -v) }),
  );
  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 3);
  assertEqual(results.length, 3, "length");
  assertEqual(results[0]?.vector.chunkId, "aligned", "first id");
  assertEqual(results[0]?.score, 1, "first score");
  assertEqual(results[1]?.vector.chunkId, "orthogonal", "second id");
  assertEqual(results[1]?.score, 0, "second score");
  assertEqual(results[2]?.vector.chunkId, "opposite", "third id");
  assertEqual(results[2]?.score, -1, "third score");
}

async function assertFindNearestIsolatesByWorkspace(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest workspace filter...");
  const index = makeIndex();
  await index.upsert(
    makeVector({ workspaceId: WORKSPACE_A, chunkId: "a-chunk", vector: unitVector(0) }),
  );
  await index.upsert(
    makeVector({ workspaceId: WORKSPACE_B, chunkId: "b-chunk", vector: unitVector(0) }),
  );
  const resultsA = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(resultsA.length, 1, "only A");
  assertEqual(resultsA[0]?.vector.chunkId, "a-chunk", "a-chunk");
  assertEqual(
    (await index.findNearest("workspace-unknown", unitVector(0), 10)).length,
    0,
    "empty",
  );
}

async function assertFindNearestBreaksTiesByChunkIdAscending(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest chunkId tie-break...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "chunk-b", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-a", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-c", vector: unitVector(0) }));
  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(
    results.map((r) => r.vector.chunkId).join(","),
    "chunk-a,chunk-b,chunk-c",
    "order",
  );
}

async function assertFindNearestTreatsZeroNormAsZeroScore(): Promise<void> {
  console.log("[embedding] OpenSearch zero-norm scores 0...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "zero-candidate", vector: [...ZERO_VECTOR] }));
  await index.upsert(makeVector({ chunkId: "unit-candidate", vector: unitVector(0) }));
  const zeroCandidate = (
    await index.findNearest(WORKSPACE_A, unitVector(0), 10)
  ).find((r) => r.vector.chunkId === "zero-candidate");
  assertEqual(zeroCandidate?.score, 0, "zero candidate");
  for (const result of await index.findNearest(WORKSPACE_A, [...ZERO_VECTOR], 10)) {
    assertEqual(result.score, 0, `zero query ${result.vector.chunkId}`);
  }
}

async function assertFindNearestRespectsLimit(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest respects limit...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "chunk-1", vector: unitVector(0) }));
  await index.upsert(makeVector({ chunkId: "chunk-2", vector: unitVector(1) }));
  await index.upsert(makeVector({ chunkId: "chunk-3", vector: unitVector(2) }));
  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 1);
  assertEqual(results.length, 1, "limit");
  assertEqual(results[0]?.vector.chunkId, "chunk-1", "best");
}

async function assertFindNearestReturnsDefensiveCopies(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest defensive copies...");
  const index = makeIndex();
  await index.upsert(makeVector({ chunkId: "chunk-1", vector: unitVector(0) }));
  const results = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  const first = results[0];
  if (!first) {
    throw new Error("expected hit");
  }
  first.vector.vector[0] = 999;
  first.score = -999;
  const second = await index.findNearest(WORKSPACE_A, unitVector(0), 10);
  assertEqual(second[0]?.vector.vector[0], 1, "vector");
  assertEqual(second[0]?.score, 1, "score");
}

async function assertFindNearestRejectsInvalidQueryVectorOrLimit(): Promise<void> {
  console.log("[embedding] OpenSearch findNearest rejects bad args...");
  const index = makeIndex();
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
    () => index.findNearest(WORKSPACE_A, unitVector(0), 0),
    "limit must be a positive integer",
  );
}

async function assertFetchTransportJoinsBaseUrl(): Promise<void> {
  console.log("[embedding] FetchOpenSearchHttpTransport joins baseUrl...");
  const { FetchOpenSearchHttpTransport } = await import(
    "./FetchOpenSearchHttpTransport"
  );
  const calls: string[] = [];
  const transport = new FetchOpenSearchHttpTransport(
    "http://localhost:9200/",
    async (url, init) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return { status: 200, text: async () => "{}" };
    },
  );
  await transport.send({ method: "GET", path: "/knowledge-embeddings/_doc/a" });
  assertEqual(
    calls[0],
    "GET http://localhost:9200/knowledge-embeddings/_doc/a",
    "url",
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
  await assertFetchTransportJoinsBaseUrl();
  console.log("OpenSearchVectorIndex validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
