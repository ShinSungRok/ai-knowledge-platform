import { KNOWLEDGE_MODULE_EMBEDDING } from "./index";
import { loadOpenSearchClientConfig } from "./loadOpenSearchClientConfig";
import type { OpenSearchClientConfig } from "./OpenSearchClientConfig";
import type { OpenSearchHttpRequest } from "./OpenSearchHttpRequest";
import type { OpenSearchHttpResponse } from "./OpenSearchHttpResponse";
import type { OpenSearchHttpTransport } from "./OpenSearchHttpTransport";

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

class FakeOpenSearchHttpTransport implements OpenSearchHttpTransport {
  readonly requests: OpenSearchHttpRequest[] = [];

  async send(request: OpenSearchHttpRequest): Promise<OpenSearchHttpResponse> {
    this.requests.push({
      method: request.method,
      path: request.path,
      ...(request.headers ? { headers: { ...request.headers } } : {}),
      ...(request.body !== undefined ? { body: request.body } : {}),
    });
    return { status: 200, body: "{}" };
  }
}

function assertModuleConstant(): void {
  console.log("[embedding] KNOWLEDGE_MODULE_EMBEDDING constant is exported...");
  assertEqual(
    KNOWLEDGE_MODULE_EMBEDDING,
    "app/knowledge/embedding",
    "module constant",
  );
}

function assertConfigNullWhenUnset(): void {
  console.log(
    "[embedding] loadOpenSearchClientConfig returns null without OPENSEARCH_URL...",
  );
  assertEqual(loadOpenSearchClientConfig({}), null, "empty");
  assertEqual(
    loadOpenSearchClientConfig({ OPENSEARCH_URL: "  " }),
    null,
    "blank",
  );
}

function assertConfigLoads(): void {
  console.log(
    "[embedding] loadOpenSearchClientConfig loads URL, index, Basic auth...",
  );
  const loaded = loadOpenSearchClientConfig({
    OPENSEARCH_URL: "http://localhost:9200/",
    OPENSEARCH_INDEX: "custom-index",
    OPENSEARCH_USERNAME: "admin",
    OPENSEARCH_PASSWORD: "secret",
  });
  assertTruthy(loaded !== null, "loaded");
  const config = loaded as OpenSearchClientConfig;
  assertEqual(config.baseUrl, "http://localhost:9200", "baseUrl");
  assertEqual(config.indexName, "custom-index", "indexName");
  assertTruthy(
    typeof config.headers?.Authorization === "string" &&
      config.headers.Authorization.startsWith("Basic "),
    "basic auth header",
  );
}

function assertDefaultIndexName(): void {
  console.log(
    "[embedding] loadOpenSearchClientConfig defaults indexName...",
  );
  const loaded = loadOpenSearchClientConfig({
    OPENSEARCH_URL: "http://opensearch:9200",
  });
  assertEqual(loaded?.indexName, "knowledge-embeddings", "default index");
}

async function assertTransportPort(): Promise<void> {
  console.log(
    "[embedding] OpenSearchHttpTransport port is implementable with Fake...",
  );
  const transport: OpenSearchHttpTransport = new FakeOpenSearchHttpTransport();
  const response = await transport.send({
    method: "GET",
    path: "/knowledge-embeddings/_doc/a",
  });
  assertEqual(response.status, 200, "status");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertConfigNullWhenUnset();
  assertConfigLoads();
  assertDefaultIndexName();
  await assertTransportPort();
  console.log("OpenSearch client contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
