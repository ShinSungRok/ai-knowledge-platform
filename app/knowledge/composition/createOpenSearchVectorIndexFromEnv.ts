import { FakeOpenSearchHttpTransport } from "../embedding/FakeOpenSearchHttpTransport";
import { FetchOpenSearchHttpTransport } from "../embedding/FetchOpenSearchHttpTransport";
import { loadOpenSearchClientConfig } from "../embedding/loadOpenSearchClientConfig";
import type { OpenSearchClientConfig } from "../embedding/OpenSearchClientConfig";
import type { OpenSearchHttpTransport } from "../embedding/OpenSearchHttpTransport";
import { OpenSearchVectorIndex } from "../embedding/OpenSearchVectorIndex";

/**
 * Builds an {@link OpenSearchVectorIndex} from env when `OPENSEARCH_URL` is set.
 * Returns `null` otherwise. Default transport is {@link FetchOpenSearchHttpTransport};
 * inject a Fake for dependency-free validation.
 */
export function createOpenSearchVectorIndexFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  transport?: OpenSearchHttpTransport,
): OpenSearchVectorIndex | null {
  const config = loadOpenSearchClientConfig(env);
  if (config === null) {
    return null;
  }
  return new OpenSearchVectorIndex(
    config,
    transport ?? new FetchOpenSearchHttpTransport(config.baseUrl),
  );
}

export type CreateOpenSearchKnowledgeCompositionOpenSearchOption = {
  config: OpenSearchClientConfig;
  transport: OpenSearchHttpTransport;
};

/**
 * Convenience for Fake-backed OpenSearch VectorIndex in composition validation.
 */
export function createFakeOpenSearchOption(
  config: OpenSearchClientConfig = {
    baseUrl: "http://opensearch.test",
    indexName: "knowledge-embeddings",
  },
): CreateOpenSearchKnowledgeCompositionOpenSearchOption {
  return {
    config,
    transport: new FakeOpenSearchHttpTransport(),
  };
}
