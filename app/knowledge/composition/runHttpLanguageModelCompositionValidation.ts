import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import type { LlmHttpRequest } from "../ai/LlmHttpRequest";
import type { LlmHttpResponse } from "../ai/LlmHttpResponse";
import type { LlmHttpTransport } from "../ai/LlmHttpTransport";
import { createInMemoryKnowledgeComposition } from "./createInMemoryKnowledgeComposition";
import { readFileSync } from "node:fs";
import path from "node:path";

const WORKSPACE_A = "workspace-a";
const MODEL_REPLY = "http-llm-composition-reply";

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
        choices: [{ message: { content: MODEL_REPLY } }],
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

async function seed(
  composition: ReturnType<typeof createInMemoryKnowledgeComposition>,
): Promise<void> {
  const document: KnowledgeDocument = {
    workspaceId: WORKSPACE_A,
    id: "doc-1",
    sourceId: "source-1",
    title: "Title",
    text: "document text",
  };
  await composition.knowledgeDocumentRepository.save(document);
  const chunk: DocumentChunk = {
    workspaceId: WORKSPACE_A,
    id: "chunk-1",
    documentId: document.id,
    text: "aaaaaaaa",
    order: 0,
  };
  await composition.documentChunkRepository.replaceForDocument(
    WORKSPACE_A,
    document.id,
    [chunk],
  );
  const embeddingProvider = new FakeEmbeddingProvider();
  const vector = await embeddingProvider.embed(chunk.text);
  await composition.vectorIndex.upsert({
    workspaceId: WORKSPACE_A,
    chunkId: chunk.id,
    vector,
  });
}

async function assertHttpLlmCompositionUsesFakeTransport(): Promise<void> {
  console.log(
    "[composition] HTTP LLM option wires HttpLanguageModelProvider via Fake transport...",
  );
  const transport = new FakeLlmHttpTransport();
  const composition = createInMemoryKnowledgeComposition(undefined, {
    llm: {
      type: "http",
      config: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4o-mini",
      },
      transport,
    },
  });
  await seed(composition);
  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  assertEqual(result.answer.text, MODEL_REPLY, "answer text from HTTP LLM");
  assertEqual(transport.requests.length, 1, "transport called once");
  assertTruthy(
    transport.requests[0]!.url.endsWith("/chat/completions"),
    "chat completions url",
  );
}

async function assertDefaultRemainsFake(): Promise<void> {
  console.log(
    "[composition] default createInMemoryKnowledgeComposition still uses Fake LLM...",
  );
  const composition = createInMemoryKnowledgeComposition();
  await seed(composition);
  const result = await composition.runtime.generateCitedGroundedAnswer({
    workspaceId: WORKSPACE_A,
    query: "aaaaaaaa",
    retrievalLimit: 5,
    maxCharacters: 10_000,
  });
  // FakeLanguageModelProvider echoes userMessage (grounded prompt user message)
  assertTruthy(
    typeof result.answer.text === "string" && result.answer.text.length > 0,
    "fake path returns text",
  );
  assertTruthy(
    result.answer.text !== MODEL_REPLY,
    "default path is not HTTP Fake transport reply",
  );
}

function assertNoFetchInApplication(): void {
  console.log(
    "[composition] application modules do not import fetch / FetchLlmHttpTransport...",
  );
  const appDir = path.resolve(process.cwd(), "app/knowledge/application");
  const source = readFileSync(
    path.join(appDir, "GenerateGroundedAnswerUseCase.ts"),
    "utf8",
  );
  assertTruthy(!source.includes("fetch("), "no fetch in grounded-answer use case");
  assertTruthy(
    !source.includes("FetchLlmHttpTransport"),
    "no FetchLlmHttpTransport in use case",
  );
}

async function main(): Promise<void> {
  await assertHttpLlmCompositionUsesFakeTransport();
  await assertDefaultRemainsFake();
  assertNoFetchInApplication();
  console.log("HTTP LLM composition validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
