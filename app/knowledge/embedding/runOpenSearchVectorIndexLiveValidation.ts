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
