import { KNOWLEDGE_MODULE_AI } from "./index";
import { loadLlmHttpProviderConfig } from "./loadLlmHttpProviderConfig";
import type { LlmHttpProviderConfig } from "./LlmHttpProviderConfig";
import type { LlmHttpRequest } from "./LlmHttpRequest";
import type { LlmHttpResponse } from "./LlmHttpResponse";
import type { LlmHttpTransport } from "./LlmHttpTransport";

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

function assertThrows(fn: () => void, messageIncludes: string): void {
  let threw = false;
  try {
    fn();
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

class FakeLlmHttpTransport implements LlmHttpTransport {
  readonly requests: LlmHttpRequest[] = [];

  async fetch(request: LlmHttpRequest): Promise<LlmHttpResponse> {
    this.requests.push({
      url: request.url,
      method: request.method,
      headers: { ...request.headers },
      body: request.body,
    });
    return {
      status: 200,
      bodyText: JSON.stringify({
        choices: [{ message: { content: "fake-response" } }],
      }),
    };
  }
}

function assertModuleConstant(): void {
  console.log("[ai] KNOWLEDGE_MODULE_AI constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_AI, "app/knowledge/ai", "module constant");
}

function assertConfigLoaderAcceptsValid(): void {
  console.log("[ai] loadLlmHttpProviderConfig accepts a valid plain object...");
  const loaded = loadLlmHttpProviderConfig({
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
    timeoutMs: 5_000,
  });
  assertEqual(loaded.baseUrl, "https://api.openai.com/v1", "baseUrl");
  assertEqual(loaded.apiKey, "sk-test", "apiKey");
  assertEqual(loaded.model, "gpt-4o-mini", "model");
  assertEqual(loaded.timeoutMs, 5_000, "timeoutMs");
}

function assertConfigLoaderDefensiveCopy(): void {
  console.log("[ai] loadLlmHttpProviderConfig returns a defensive copy...");
  const raw = {
    baseUrl: "https://example.com/v1",
    apiKey: "key",
    model: "model-a",
  };
  const loaded = loadLlmHttpProviderConfig(raw);
  raw.apiKey = "mutated";
  assertEqual(loaded.apiKey, "key", "apiKey not aliased");
}

function assertConfigLoaderRejectsInvalid(): void {
  console.log("[ai] loadLlmHttpProviderConfig rejects invalid input...");
  assertThrows(() => loadLlmHttpProviderConfig(null), "plain object");
  assertThrows(() => loadLlmHttpProviderConfig([]), "plain object");
  assertThrows(
    () =>
      loadLlmHttpProviderConfig({
        baseUrl: "",
        apiKey: "k",
        model: "m",
      }),
    "baseUrl must be a non-empty string",
  );
  assertThrows(
    () =>
      loadLlmHttpProviderConfig({
        baseUrl: "https://x",
        apiKey: "k",
        model: "m",
        timeoutMs: 0,
      }),
    "timeoutMs must be a positive integer",
  );
}

async function assertTransportPortContract(): Promise<void> {
  console.log("[ai] LlmHttpTransport port is implementable with Fake transport...");
  const transport: LlmHttpTransport = new FakeLlmHttpTransport();
  const request: LlmHttpRequest = {
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST",
    headers: {
      authorization: "Bearer sk-test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [] }),
  };
  const response: LlmHttpResponse = await transport.fetch(request);
  assertEqual(response.status, 200, "status");
  assertTruthy(response.bodyText.includes("fake-response"), "bodyText");

  const config: LlmHttpProviderConfig = loadLlmHttpProviderConfig({
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
  });
  assertEqual(config.model, "gpt-4o-mini", "config usable with transport types");
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertConfigLoaderAcceptsValid();
  assertConfigLoaderDefensiveCopy();
  assertConfigLoaderRejectsInvalid();
  await assertTransportPortContract();
  console.log("LlmHttpProvider contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
