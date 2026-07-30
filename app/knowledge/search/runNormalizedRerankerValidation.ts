import { readFileSync } from "node:fs";
import path from "node:path";

import { NormalizedReranker } from "./NormalizedReranker";
import type { Reranker } from "./Reranker";
import type { RerankingInput } from "./RerankingInput";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { RetrievedChunk } from "../retrieval/RetrievalResult";

const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const MAX_RRF_SCORE = 2 / 61;

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

function assertClose(actual: number, expected: number, message: string): void {
  assertTruthy(
    Math.abs(actual - expected) < 1e-9,
    `${message} (actual=${actual}, expected=${expected})`,
  );
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

function chunk(overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: "doc-1",
    text: "body",
    order: 0,
    ...overrides,
  };
}

function retrieved(
  chunkOverrides: Partial<DocumentChunk> = {},
  score = 0,
): RetrievedChunk {
  return { chunk: chunk(chunkOverrides), score };
}

function buildReranker(vectorWeight?: number): Reranker {
  return new NormalizedReranker(vectorWeight);
}

async function assertPortContract(): Promise<void> {
  console.log("[search] port contract (Reranker)...");
  const reranker = buildReranker();
  assertTruthy(typeof reranker.rerank === "function", "rerank must be defined");
}

async function assertConstructorRejectsInvalidWeight(): Promise<void> {
  console.log("[search] constructor rejects a vectorWeight outside 0..1...");
  assertTruthy(
    (() => {
      try {
        new NormalizedReranker(1.5);
        return false;
      } catch (error) {
        return (
          error instanceof Error &&
          error.message.includes("vectorWeight must be a number between 0 and 1")
        );
      }
    })(),
    "expected constructor to reject vectorWeight > 1",
  );
  assertTruthy(
    (() => {
      try {
        new NormalizedReranker(-0.1);
        return false;
      } catch (error) {
        return (
          error instanceof Error &&
          error.message.includes("vectorWeight must be a number between 0 and 1")
        );
      }
    })(),
    "expected constructor to reject a negative vectorWeight",
  );
}

async function assertRanksByQueryTokenCoverage(): Promise<void> {
  console.log("[search] rerank ranks a candidate covering more unique query tokens ahead of one covering fewer...");
  const reranker = buildReranker();

  const fullCoverage = retrieved({ id: "chunk-full", text: "alpha beta gamma" }, 0);
  const partialCoverage = retrieved({ id: "chunk-partial", text: "alpha gamma delta" }, 0);

  const result = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha beta",
    chunks: [partialCoverage, fullCoverage],
  });

  assertEqual(result.length, 2, "expected every candidate to be returned");
  assertEqual(result[0]?.chunk.id, "chunk-full", "expected the chunk covering both query tokens to rank first");
  assertClose(result[0]?.score ?? NaN, 0.5 * ((1 + 2 / 3) / 2), "expected 0.5*0 (no retrieved score) + 0.5*keywordSignal(coverage=1, density=2/3)");
  assertEqual(result[1]?.chunk.id, "chunk-partial", "expected the chunk covering only one query token to rank second");
  assertClose(result[1]?.score ?? NaN, 0.5 * ((0.5 + 1 / 3) / 2), "expected 0.5*0 + 0.5*keywordSignal(coverage=0.5, density=1/3)");
}

async function assertVectorSignalIsNormalizedAgainstMaxRrfScore(): Promise<void> {
  console.log("[search] rerank normalizes retrieved.score against the RRF ceiling before weighting it...");
  const reranker = buildReranker();

  const higherOriginal = retrieved({ id: "chunk-higher", text: "alpha filler" }, MAX_RRF_SCORE);
  const lowerOriginal = retrieved({ id: "chunk-lower", text: "alpha filler" }, MAX_RRF_SCORE / 2);

  const result = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [lowerOriginal, higherOriginal],
  });

  assertEqual(result.length, 2, "expected every candidate to be returned");
  assertEqual(result[0]?.chunk.id, "chunk-higher", "expected the full-strength RRF score to rank first");
  assertClose(result[0]?.score ?? NaN, 0.5 * 1 + 0.5 * 0.75, "expected vectorSignal=1 (score at RRF ceiling) + keywordSignal=0.75 (coverage=1, density=0.5)");
  assertEqual(result[1]?.chunk.id, "chunk-lower", "expected the half-strength RRF score to rank second");
  assertClose(result[1]?.score ?? NaN, 0.5 * 0.5 + 0.5 * 0.75, "expected vectorSignal=0.5 (half the RRF ceiling) + keywordSignal=0.75");
}

async function assertVectorSignalClampsAtOneAboveTheRrfCeiling(): Promise<void> {
  console.log("[search] rerank clamps vectorSignal to 1 for a retrieved.score above the RRF ceiling...");
  const reranker = buildReranker();

  const aboveCeiling = retrieved({ id: "chunk-1", text: "alpha" }, 1);
  const atCeiling = retrieved({ id: "chunk-2", text: "alpha" }, MAX_RRF_SCORE);

  const [above, at] = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [aboveCeiling, atCeiling],
  });

  assertClose(above?.score ?? NaN, at?.score ?? NaN, "expected a retrieved.score above the RRF ceiling to score identically to one exactly at the ceiling (both clamp to vectorSignal=1)");
}

async function assertWeakKeywordOverlapCanBeOutrankedByStrongVectorSignal(): Promise<void> {
  console.log("[search] a strong vector-only match can now outrank a weak-vector, keyword-heavy match (the fix's whole point)...");
  const reranker = buildReranker();

  const keywordHeavy = retrieved(
    { id: "chunk-keyword", text: "alpha filler filler filler" },
    0,
  );
  const vectorOnly = retrieved(
    { id: "chunk-vector", text: "completely unrelated wording" },
    MAX_RRF_SCORE,
  );

  const result = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [keywordHeavy, vectorOnly],
  });

  assertEqual(
    result[0]?.chunk.id,
    "chunk-vector",
    "expected the full-strength vector match to outrank a keyword-only match once both signals are on the same 0..1 scale",
  );
}

async function assertVectorWeightIsConfigurable(): Promise<void> {
  console.log("[search] a lower vectorWeight shifts influence back toward the keyword signal...");
  const vectorHeavyReranker = buildReranker(0.9);
  const keywordHeavyReranker = buildReranker(0.1);

  const keywordCandidate = retrieved({ id: "chunk-keyword", text: "alpha alpha" }, 0);
  const vectorCandidate = retrieved({ id: "chunk-vector", text: "unrelated"}, MAX_RRF_SCORE / 4);

  const vectorHeavyResult = await vectorHeavyReranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [keywordCandidate, vectorCandidate],
  });
  const keywordHeavyResult = await keywordHeavyReranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [keywordCandidate, vectorCandidate],
  });

  assertEqual(vectorHeavyResult[0]?.chunk.id, "chunk-vector", "expected vectorWeight=0.9 to favor the vector-only candidate");
  assertEqual(keywordHeavyResult[0]?.chunk.id, "chunk-keyword", "expected vectorWeight=0.1 to favor the keyword-heavy candidate");
}

async function assertBreaksExactScoreTiesByChunkIdAscending(): Promise<void> {
  console.log("[search] rerank breaks an exact reranked-score tie by chunk id ascending...");
  const reranker = buildReranker();

  const z = retrieved({ id: "chunk-z", text: "alpha filler" }, 0.01);
  const a = retrieved({ id: "chunk-a", text: "alpha filler" }, 0.01);

  const result = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [z, a],
  });

  assertEqual(result.length, 2, "expected every candidate to be returned");
  assertEqual(result[0]?.score, result[1]?.score, "expected both candidates to have an exactly equal reranked score");
  assertEqual(result[0]?.chunk.id, "chunk-a", "expected the lexicographically smaller id to rank first on an exact tie");
  assertEqual(result[1]?.chunk.id, "chunk-z", "expected the lexicographically larger id to rank second on an exact tie");
}

async function assertPreservesWorkspaceIdWithoutFilteringCandidates(): Promise<void> {
  console.log("[search] rerank accepts and validates workspaceId without using it to filter candidates (that isolation is the caller's responsibility)...");
  const reranker = buildReranker();

  const sameWorkspace = retrieved({ id: "chunk-same", workspaceId: WORKSPACE_B, text: "alpha" }, 0);
  const differentWorkspace = retrieved({ id: "chunk-different", workspaceId: WORKSPACE_A, text: "alpha" }, 0);

  const input: RerankingInput = {
    workspaceId: WORKSPACE_B,
    query: "alpha",
    chunks: [sameWorkspace, differentWorkspace],
  };
  const result = await reranker.rerank(input);

  assertEqual(result.length, 2, "expected every candidate to be returned regardless of its own chunk.workspaceId");
  assertEqual(input.workspaceId, WORKSPACE_B, "expected the input's own workspaceId field to be left unchanged by rerank");
}

async function assertReturnsEmptyForEmptyChunks(): Promise<void> {
  console.log("[search] rerank returns an empty array for an empty chunk list...");
  const reranker = buildReranker();

  const result = await reranker.rerank({
    workspaceId: WORKSPACE_A,
    query: "alpha",
    chunks: [],
  });

  assertEqual(result.length, 0, "expected an empty result");
}

async function assertDoesNotMutateInputAndReturnsFreshObjects(): Promise<void> {
  console.log("[search] rerank never mutates the input array/objects and returns fresh RetrievedChunk objects...");
  const reranker = buildReranker();

  const original = retrieved({ id: "chunk-1", text: "alpha" }, 0.01);
  const chunks = [original];
  const input: RerankingInput = { workspaceId: WORKSPACE_A, query: "alpha", chunks };

  const result = await reranker.rerank(input);

  assertEqual(input.chunks, chunks, "expected the input's chunks array reference to be unchanged");
  assertEqual(chunks[0], original, "expected the input's chunks array to still hold the original RetrievedChunk reference");
  assertEqual(original.score, 0.01, "expected the original RetrievedChunk's score to be unmutated");
  assertTruthy(result[0]?.chunk !== original.chunk, "expected the returned chunk to be a fresh object, not the same reference as the input's chunk");

  if (result[0]) {
    result[0].score = -999;
    (result[0].chunk as DocumentChunk).text = "mutated";
  }
  assertEqual(original.score, 0.01, "expected mutating the returned entry to leave the original RetrievedChunk's score unchanged");
  assertEqual(original.chunk.text, "alpha", "expected mutating the returned entry's chunk to leave the original chunk's text unchanged");
}

async function assertRejectsInvalidInput(): Promise<void> {
  console.log("[search] rerank rejects invalid workspaceId/query/chunks input, and malformed RetrievedChunk entries...");
  const reranker = buildReranker();

  await assertThrowsAsync(
    () => reranker.rerank({ workspaceId: " ", query: "q", chunks: [] }),
    "RerankingInput.workspaceId must be a non-empty string",
  );
  await assertThrowsAsync(
    () => reranker.rerank({ workspaceId: WORKSPACE_A, query: " ", chunks: [] }),
    "RerankingInput.query must be a non-empty string",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => reranker.rerank({ workspaceId: WORKSPACE_A, query: "q", chunks: "not-an-array" }),
    "RerankingInput.chunks must be an array",
  );
  await assertThrowsAsync(
    () =>
      // @ts-expect-error intentionally invalid for validation coverage
      reranker.rerank({ workspaceId: WORKSPACE_A, query: "q", chunks: [{ chunk: chunk(), score: "high" }] }),
    "RetrievedChunk.score must be a finite number",
  );
  await assertThrowsAsync(
    // @ts-expect-error intentionally invalid for validation coverage
    () => reranker.rerank(null),
    "RerankingInput must be an object",
  );
}

function assertNormalizedRerankerImportsOnlyPorts(): void {
  console.log("[search] NormalizedReranker imports only ports/internal utilities, never a concrete adapter...");
  const sourcePath = path.resolve(
    process.cwd(),
    "app/knowledge/search/NormalizedReranker.ts",
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
    "DefaultReranker",
    "../persistence",
    "../repository",
    "../embedding",
  ];
  for (const reference of forbiddenReferences) {
    assertTruthy(
      !source.includes(reference),
      `NormalizedReranker.ts must not reference concrete adapter "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  await assertPortContract();
  await assertConstructorRejectsInvalidWeight();
  await assertRanksByQueryTokenCoverage();
  await assertVectorSignalIsNormalizedAgainstMaxRrfScore();
  await assertVectorSignalClampsAtOneAboveTheRrfCeiling();
  await assertWeakKeywordOverlapCanBeOutrankedByStrongVectorSignal();
  await assertVectorWeightIsConfigurable();
  await assertBreaksExactScoreTiesByChunkIdAscending();
  await assertPreservesWorkspaceIdWithoutFilteringCandidates();
  await assertReturnsEmptyForEmptyChunks();
  await assertDoesNotMutateInputAndReturnsFreshObjects();
  await assertRejectsInvalidInput();
  assertNormalizedRerankerImportsOnlyPorts();
  console.log("NormalizedReranker validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
