import { FetchOpenSearchHttpTransport } from "./FetchOpenSearchHttpTransport";
import { loadOpenSearchClientConfig } from "./loadOpenSearchClientConfig";
import { OpenSearchVectorIndex } from "./OpenSearchVectorIndex";
import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";

/**
 * Optional live OpenSearch cluster check.
 * Skips (exit 0) when OPENSEARCH_URL is unset. Not part of top-level validate.
 */
async function main(): Promise<void> {
  const config = loadOpenSearchClientConfig(process.env);
  if (config === null) {
    console.log(
      "[embedding] OPENSEARCH_URL unset — skipping live OpenSearchVectorIndex validation.",
    );
    return;
  }

  const index = new OpenSearchVectorIndex(
    config,
    new FetchOpenSearchHttpTransport(config.baseUrl),
  );
  const workspaceId = "live-validation-workspace";
  const chunkId = `live-chunk-${Date.now()}`;
  const vector = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
  vector[0] = 1;

  await index.upsert({ workspaceId, chunkId, vector });
  const found = await index.findByChunkId(workspaceId, chunkId);
  if (found === null || found.chunkId !== chunkId) {
    throw new Error("live findByChunkId failed after upsert");
  }
  const nearest = await index.findNearest(workspaceId, vector, 1);
  if (nearest.length !== 1 || nearest[0]?.vector.chunkId !== chunkId) {
    throw new Error("live findNearest failed");
  }

  // Regression guard: a single-vector, self-query check above can pass even
  // if cosine scoring is silently scrambled (e.g. the historical bug where
  // OpenSearch's `doc['field'][i]` script access returns a multi-valued
  // float field's doc-values in sorted order, not insertion order — see
  // OpenSearchVectorIndex's class doc). Two orthogonal candidates plus an
  // aligned query is the minimum case that would have caught it: a scrambled
  // score would not reliably rank the aligned vector first with score ~1
  // and the orthogonal one with score ~0.
  const alignedChunkId = `live-aligned-${Date.now()}`;
  const orthogonalChunkId = `live-orthogonal-${Date.now()}`;
  const aligned = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
  aligned[0] = 1;
  const orthogonal = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0);
  orthogonal[1] = 1;
  await index.upsert({ workspaceId, chunkId: alignedChunkId, vector: aligned });
  await index.upsert({
    workspaceId,
    chunkId: orthogonalChunkId,
    vector: orthogonal,
  });
  const ranked = await index.findNearest(workspaceId, aligned, 3);
  const alignedResult = ranked.find((r) => r.vector.chunkId === alignedChunkId);
  const orthogonalResult = ranked.find(
    (r) => r.vector.chunkId === orthogonalChunkId,
  );
  if (alignedResult === undefined || alignedResult.score < 0.99) {
    throw new Error(
      `live findNearest aligned score should be ~1, got ${String(alignedResult?.score)}`,
    );
  }
  if (orthogonalResult === undefined || Math.abs(orthogonalResult.score) > 0.01) {
    throw new Error(
      `live findNearest orthogonal score should be ~0, got ${String(orthogonalResult?.score)}`,
    );
  }
  if (ranked[0]?.vector.chunkId !== alignedChunkId) {
    throw new Error("live findNearest did not rank the aligned vector first");
  }
  await index.deleteByChunkId(workspaceId, alignedChunkId);
  await index.deleteByChunkId(workspaceId, orthogonalChunkId);

  await index.deleteByChunkId(workspaceId, chunkId);
  const after = await index.findByChunkId(workspaceId, chunkId);
  if (after !== null) {
    throw new Error("live deleteByChunkId failed");
  }
  console.log("OpenSearchVectorIndex live validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
