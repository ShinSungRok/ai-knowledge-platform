import type { GroundedPrompt } from "../prompt/GroundedPrompt";
import { HttpLanguageModelProvider } from "./HttpLanguageModelProvider";
import type { LlmHttpProviderConfig } from "./LlmHttpProviderConfig";
import type { LlmHttpRequest } from "./LlmHttpRequest";
import type { LlmHttpResponse } from "./LlmHttpResponse";
import type { LlmHttpTransport } from "./LlmHttpTransport";

type FakeMode = "success" | "http_error" | "invalid_json";

/**
 * Validation-only Fake {@link LlmHttpTransport}: records requests and
 * returns a fixed OpenAI-like JSON body (or configured failure modes).
 */
class FakeLlmHttpTransport implements LlmHttpTransport {
  readonly requests: LlmHttpRequest[] = [];

  constructor(private readonly mode: FakeMode = "success") {}

  async fetch(request: LlmHttpRequest): Promise<LlmHttpResponse> {
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
    return {
      status: 200,
      bodyText: JSON.stringify({
        choices: [{ message: { content: "model-reply-text" } }],
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

const CONFIG: LlmHttpProviderConfig = {
  baseUrl: "https://api.openai.com/v1/",
  apiKey: "sk-test-key",
  model: "gpt-4o-mini",
};

function prompt(): GroundedPrompt {
  return {
    systemInstruction: "You are a knowledge assistant.",
    userMessage: "Question:\nwhat is the policy?",
  };
}

async function assertSuccessPath(): Promise<void> {
  console.log("[ai] HttpLanguageModelProvider returns content via Fake transport...");
  const transport = new FakeLlmHttpTransport("success");
  const provider = new HttpLanguageModelProvider(CONFIG, transport);
  const result = await provider.generate(prompt());
  assertEqual(result.text, "model-reply-text", "content");
}

async function assertRequestShape(): Promise<void> {
  console.log(
    "[ai] HttpLanguageModelProvider builds OpenAI-compatible request shape...",
  );
  const transport = new FakeLlmHttpTransport("success");
  const provider = new HttpLanguageModelProvider(CONFIG, transport);
  const input = prompt();
  await provider.generate(input);

  assertEqual(transport.requests.length, 1, "one request");
  const request = transport.requests[0]!;
  assertEqual(
    request.url,
    "https://api.openai.com/v1/chat/completions",
    "url trailing slash normalized",
  );
  assertEqual(request.method, "POST", "method");
  assertEqual(
    request.headers["authorization"],
    "Bearer sk-test-key",
    "authorization",
  );
  assertEqual(
    request.headers["content-type"],
    "application/json",
    "content-type",
  );

  const body = JSON.parse(request.body) as {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  };
  assertEqual(body.model, "gpt-4o-mini", "model");
  assertEqual(body.messages.length, 2, "messages length");
  assertEqual(body.messages[0]!.role, "system", "system role");
  assertEqual(
    body.messages[0]!.content,
    input.systemInstruction,
    "system content unchanged",
  );
  assertEqual(body.messages[1]!.role, "user", "user role");
  assertEqual(
    body.messages[1]!.content,
    input.userMessage,
    "user content unchanged",
  );
  assertEqual(
    body.temperature,
    undefined,
    "temperature omitted from body when config has none",
  );
}

async function assertRequestIncludesTemperatureWhenConfigured(): Promise<void> {
  console.log(
    "[ai] HttpLanguageModelProvider includes temperature in body when configured...",
  );
  const transport = new FakeLlmHttpTransport("success");
  const provider = new HttpLanguageModelProvider(
    { ...CONFIG, temperature: 0 },
    transport,
  );
  await provider.generate(prompt());
  const body = JSON.parse(transport.requests[0]!.body) as {
    temperature?: number;
  };
  assertEqual(body.temperature, 0, "temperature included in body");
}

async function assertErrorMapping(): Promise<void> {
  console.log("[ai] HttpLanguageModelProvider maps non-2xx and invalid JSON...");
  const httpErrorTransport = new FakeLlmHttpTransport("http_error");
  await assertThrowsAsync(
    () =>
      new HttpLanguageModelProvider(CONFIG, httpErrorTransport).generate(
        prompt(),
      ),
    "LLM HTTP request failed: 503",
  );

  const invalidTransport = new FakeLlmHttpTransport("invalid_json");
  await assertThrowsAsync(
    () =>
      new HttpLanguageModelProvider(CONFIG, invalidTransport).generate(prompt()),
    "LLM HTTP response is invalid",
  );
}

async function assertDoesNotMutatePrompt(): Promise<void> {
  console.log("[ai] HttpLanguageModelProvider never mutates the prompt...");
  const transport = new FakeLlmHttpTransport("success");
  const provider = new HttpLanguageModelProvider(CONFIG, transport);
  const input = prompt();
  const originalSystem = input.systemInstruction;
  const originalUser = input.userMessage;
  await provider.generate(input);
  assertEqual(input.systemInstruction, originalSystem, "systemInstruction");
  assertEqual(input.userMessage, originalUser, "userMessage");
}

async function main(): Promise<void> {
  await assertSuccessPath();
  await assertRequestShape();
  await assertRequestIncludesTemperatureWhenConfigured();
  await assertErrorMapping();
  await assertDoesNotMutatePrompt();
  console.log("HttpLanguageModelProvider validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
