import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
import { HealthController } from "./HealthController";
import { KNOWLEDGE_MODULE_API } from "./index";

const WORKSPACE_A = "workspace-a";

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

async function seedRuntime(): Promise<{
  runtime: KnowledgeRuntime;
  composition: ReturnType<typeof createInMemoryKnowledgeComposition>;
}> {
  const composition = createInMemoryKnowledgeComposition();
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
  return { runtime: composition.runtime, composition };
}

function assertModuleConstant(): void {
  console.log("[api] KNOWLEDGE_MODULE_API constant is exported correctly...");
  assertEqual(KNOWLEDGE_MODULE_API, "app/knowledge/api", "unexpected module constant");
}

async function assertHealth(): Promise<void> {
  console.log("[api] HealthController GET /health returns ok...");
  const health = new HealthController();
  const response = await health.check({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(response.status, 200, "status");
  assertEqual((response.body as { status: string }).status, "ok", "body");
}

async function assertCitedAnswerSuccess(): Promise<void> {
  console.log(
    "[api] CitedGroundedAnswerController returns 200 with answer and citations...",
  );
  const { runtime } = await seedRuntime();
  const controller = new CitedGroundedAnswerController(runtime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: { "content-type": "application/json" },
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(response.status, 200, "status");
  const body = response.body as {
    workspaceId: string;
    query: string;
    answer: { text: string; evidence: unknown[] };
    citations: unknown[];
  };
  assertEqual(body.workspaceId, WORKSPACE_A, "workspaceId");
  assertEqual(body.query, "aaaaaaaa", "query");
  assertTruthy(typeof body.answer.text === "string", "answer.text");
  assertTruthy(body.citations.length > 0, "citations present");
}

async function assertInvalidInput400(): Promise<void> {
  console.log("[api] CitedGroundedAnswerController rejects invalid input with 400...");
  const { runtime } = await seedRuntime();
  const controller = new CitedGroundedAnswerController(runtime);

  const missingQuery = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: {},
  });
  assertEqual(missingQuery.status, 400, "missing query");

  const badBody = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: "nope",
  });
  assertEqual(badBody.status, 400, "non-object body");
}

async function assertMethodNotAllowed(): Promise<void> {
  console.log("[api] CitedGroundedAnswerController returns 405 for non-POST...");
  const { runtime } = await seedRuntime();
  const controller = new CitedGroundedAnswerController(runtime);
  const response = await controller.create({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
  });
  assertEqual(response.status, 405, "status");
}

async function assertRuntimeThrow500(): Promise<void> {
  console.log("[api] CitedGroundedAnswerController maps runtime throw to 500...");
  const failingRuntime: KnowledgeRuntime = {
    config: {
      defaultRetrievalLimit: 5,
      defaultMaxCharacters: 2000,
      defaultToolTimeoutMs: 1000,
      maxChunkLength: 200,
    },
    async generateCitedGroundedAnswer(): Promise<CitedGroundedAnswer> {
      throw new Error("boom");
    },
  };
  const controller = new CitedGroundedAnswerController(failingRuntime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "q" },
  });
  assertEqual(response.status, 500, "status");
  assertEqual((response.body as { error: string }).error, "boom", "error");
}

async function assertRouterWiresHealthAndCitedAnswer(): Promise<void> {
  console.log(
    "[api] createKnowledgeHttpRouter wires health and cited-answer routes...",
  );
  const { runtime } = await seedRuntime();
  const router = createKnowledgeHttpRouter(runtime);

  const health = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(health.status, 200, "health");

  const cited = await router.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(cited.status, 200, "cited-answer");
}

function assertControllerDependsOnlyOnRuntime(): void {
  console.log(
    "[api] CitedGroundedAnswerController imports KnowledgeRuntime, not concrete composition adapters...",
  );
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "app/knowledge/api/CitedGroundedAnswerController.ts",
    ),
    "utf8",
  );
  const forbidden = [
    "createInMemoryKnowledgeComposition",
    "DefaultInMemoryRepository",
    "InMemoryVectorIndex",
    "FakeEmbeddingProvider",
    "FakeLanguageModelProvider",
  ];
  for (const reference of forbidden) {
    assertTruthy(
      !source.includes(reference),
      `CitedGroundedAnswerController must not reference "${reference}"`,
    );
  }
  assertTruthy(
    source.includes('from "../composition/KnowledgeRuntime"'),
    "must import KnowledgeRuntime",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertHealth();
  await assertCitedAnswerSuccess();
  await assertInvalidInput400();
  await assertMethodNotAllowed();
  await assertRuntimeThrow500();
  await assertRouterWiresHealthAndCitedAnswer();
  assertControllerDependsOnlyOnRuntime();
  console.log("CitedGroundedAnswerController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
