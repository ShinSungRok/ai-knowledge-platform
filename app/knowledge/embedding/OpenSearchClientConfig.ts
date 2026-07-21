/**
 * Configuration for OpenSearch VectorIndex HTTP access.
 *
 * `baseUrl` is the cluster root (trailing slash normalized by loader).
 * Official OpenSearch SDK config types are intentionally unused.
 */
export type OpenSearchClientConfig = {
  baseUrl: string;
  indexName: string;
  headers?: Readonly<Record<string, string>>;
};
