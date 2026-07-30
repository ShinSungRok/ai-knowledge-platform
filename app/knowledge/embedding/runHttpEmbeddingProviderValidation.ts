import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingHttpProviderConfig } from "./EmbeddingHttpProviderConfig";
import type { EmbeddingHttpRequest } from "./EmbeddingHttpRequest";
import type { EmbeddingHttpResponse } from "./EmbeddingHttpResponse";
import type { EmbeddingHttpTransport } from "./EmbeddingHttpTransport";
import { HttpEmbeddingProvider } from "./HttpEmbeddingProvider";

type FakeMode = "success" | "http_error" | "invalid_json" | "missing_embedding";

/**
 * Validation-only Fake {@link EmbeddingHttpTransport}: records requests and
 * returns a fixed OpenAI-like embeddings response (or configured failure
 * modes).
 */
class FakeEmbeddingHttpTransport implements EmbeddingHttpTransport {
  readonly requests: EmbeddingHttpRequest[] = [];

  constructor(private readonly mode: FakeMode = "success") {}

  async fetch(request: EmbeddingHttpRequest): Promise<EmbeddingHttpResponse> {
    this.requests.push({
      url: request.url,
      method: request.method,
      headers: { ...request.headers },
      body: request.body,
    });
    if (this.mode === "http_error") {
      return { status: 503, bodyText: "unavailable" };
    }
    if (this.mode === "invalid_json") {
      return { status: 200, bodyText: "not-json{" };
    }
    if (this.mode === "missing_embedding") {
      return { status: 200, bodyText: JSON.stringify({ data: [{}] }) };
    }
    const embedding = new Array(EMBEDDING_VECTOR_DIMENSION).fill(0).map((_, i) => i / 100);
    return {
      status: 200,
      bodyText: JSON.stringify({
        data: [{ object: "embedding", index: 0, embedding }],
        model: "text-embedding-3-small",
      }),
    };
  }
}

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
  messageIncludes: string,
): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch (error: unknown) {
    threw = true;
    const message = error instanceof Error ? error.message : String(error);
    assertTruthy(
      message.includes(messageIncludes),
      `expected error to include "${messageIncludes}", got "${message}"`,
    );
  }
  assertTruthy(threw, `expected throw including "${messageIncludes}"`);
}

const CONFIG: EmbeddingHttpProviderConfig = {
  baseUrl: "https://api.openai.com/v1/",
  apiKey: "sk-test-key",
  model: "text-embedding-3-small",
  dimensions: EMBEDDING_VECTOR_DIMENSION,
};

async function assertSuccessPath(): Promise<void> {
  console.log("[embedding] HttpEmbeddingProvider returns a vector via Fake transport...");
  const transport = new FakeEmbeddingHttpTransport("success");
  const provider = new HttpEmbeddingProvider(CONFIG, transport);
  const result = await provider.embed("what is the policy?");
  assertEqual(result.length, EMBEDDING_VECTOR_DIMENSION, "vector dimension");
  assertTruthy(
    result.every((value) => typeof value === "number" && Number.isFinite(value)),
    "every entry must be a finite number",
  );
}

async function assertRequestShape(): Promise<void> {
  console.log("[embedding] HttpEmbeddingProvider builds OpenAI-compatible request shape...");
  const transport = new FakeEmbeddingHttpTransport("success");
  const provider = new HttpEmbeddingProvider(CONFIG, transport);
  await provider.embed("hello world");

  assertEqual(transport.requests.length, 1, "one request");
  const request = transport.requests[0]!;
  assertEqual(
    request.url,
    "https://api.openai.com/v1/embeddings",
    "url trailing slash normalized",
  );
  assertEqual(request.method, "POST", "method");
  assertEqual(request.headers["authorization"], "Bearer sk-test-key", "authorization");
  assertEqual(request.headers["content-type"], "application/json", "content-type");

  const body = JSON.parse(request.body) as {
    model: string;
    input: string;
    dimensions?: number;
  };
  assertEqual(body.model, "text-embedding-3-small", "model");
  assertEqual(body.input, "hello world", "input unchanged");
  assertEqual(body.dimensions, EMBEDDING_VECTOR_DIMENSION, "dimensions forwarded");
}

async function assertDimensionsOmittedWhenNotConfigured(): Promise<void> {
  console.log("[embedding] HttpEmbeddingProvider omits dimensions when not configured...");
  const transport = new FakeEmbeddingHttpTransport("success");
  const configWithoutDimensions: EmbeddingHttpProviderConfig = {
    baseUrl: CONFIG.baseUrl,
    apiKey: CONFIG.apiKey,
    model: CONFIG.model,
  };
  const provider = new HttpEmbeddingProvider(configWithoutDimensions, transport);
  await provider.embed("hello world");

  const body = JSON.parse(transport.requests[0]!.body) as Record<string, unknown>;
  assertTruthy(!("dimensions" in body), "dimensions must be omitted");
}

async function assertErrorMapping(): Promise<void> {
  console.log("[embedding] HttpEmbeddingProvider maps non-2xx, invalid JSON, and malformed bodies...");
  const httpErrorTransport = new FakeEmbeddingHttpTransport("http_error");
  await assertThrowsAsync(
    () => new HttpEmbeddingProvider(CONFIG, httpErrorTransport).embed("x"),
    "Embedding HTTP request failed: 503",
  );

  const invalidTransport = new FakeEmbeddingHttpTransport("invalid_json");
  await assertThrowsAsync(
    () => new HttpEmbeddingProvider(CONFIG, invalidTransport).embed("x"),
    "Embedding HTTP response is invalid",
  );

  const missingEmbeddingTransport = new FakeEmbeddingHttpTransport("missing_embedding");
  await assertThrowsAsync(
    () => new HttpEmbeddingProvider(CONFIG, missingEmbeddingTransport).embed("x"),
    "Embedding HTTP response is invalid",
  );
}

async function assertRejectsEmptyOrWhitespaceText(): Promise<void> {
  console.log("[embedding] HttpEmbeddingProvider rejects empty or whitespace-only text...");
  const transport = new FakeEmbeddingHttpTransport("success");
  const provider = new HttpEmbeddingProvider(CONFIG, transport);
  await assertThrowsAsync(
    () => provider.embed(""),
    "must be a non-empty, non-whitespace string",
  );
  await assertThrowsAsync(
    () => provider.embed("   "),
    "must be a non-empty, non-whitespace string",
  );
}

async function main(): Promise<void> {
  await assertSuccessPath();
  await assertRequestShape();
  await assertDimensionsOmittedWhenNotConfigured();
  await assertErrorMapping();
  await assertRejectsEmptyOrWhitespaceText();
  console.log("HttpEmbeddingProvider validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
