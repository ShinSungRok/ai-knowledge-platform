import type { OpenSearchClientConfig } from "./OpenSearchClientConfig";

/**
 * Loads {@link OpenSearchClientConfig} from environment-like records.
 * Returns `null` when `OPENSEARCH_URL` is unset/empty.
 */
export function loadOpenSearchClientConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): OpenSearchClientConfig | null {
  const rawUrl = env["OPENSEARCH_URL"];
  if (rawUrl === undefined || rawUrl.trim().length === 0) {
    return null;
  }

  const baseUrl = rawUrl.trim().replace(/\/+$/, "");
  const indexRaw = env["OPENSEARCH_INDEX"];
  const indexName =
    indexRaw !== undefined && indexRaw.trim().length > 0
      ? indexRaw.trim()
      : "knowledge-embeddings";

  const headers = buildAuthHeaders(env);
  const config: OpenSearchClientConfig = {
    baseUrl,
    indexName,
  };
  if (Object.keys(headers).length > 0) {
    config.headers = { ...headers };
  }
  return config;
}

function buildAuthHeaders(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): Record<string, string> {
  const username = env["OPENSEARCH_USERNAME"];
  const password = env["OPENSEARCH_PASSWORD"];
  if (
    username === undefined ||
    username.trim().length === 0 ||
    password === undefined
  ) {
    return {};
  }
  const token = Buffer.from(
    `${username.trim()}:${password}`,
    "utf8",
  ).toString("base64");
  return { Authorization: `Basic ${token}` };
}
