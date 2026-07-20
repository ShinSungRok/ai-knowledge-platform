import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createInMemoryKnowledgeComposition } from "../composition/createInMemoryKnowledgeComposition";
import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import { ApiKeyAuthenticator } from "../security/ApiKeyAuthenticator";
import { DefaultWorkspaceAuthorizer } from "../security/DefaultWorkspaceAuthorizer";
import { HttpBearerGuard } from "../security/HttpBearerGuard";
import type { WorkspaceAuthorizer } from "../security/WorkspaceAuthorizer";
import { CitedGroundedAnswerController } from "./CitedGroundedAnswerController";
import { createKnowledgeHttpRouter } from "./createKnowledgeHttpRouter";
import { HealthController } from "./HealthController";
import { KNOWLEDGE_MODULE_API } from "./index";

const WORKSPACE_A = "workspace-a";
const TEST_API_KEY = "test-api-key";
const OTHER_WORKSPACE_KEY = "other-workspace-key";

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

function buildAuth(): {
  bearerGuard: HttpBearerGuard;
  workspaceAuthorizer: WorkspaceAuthorizer;
} {
  const authenticator = new ApiKeyAuthenticator({
    [TEST_API_KEY]: { subject: "test-user", workspaceId: WORKSPACE_A },
    [OTHER_WORKSPACE_KEY]: {
      subject: "other-user",
      workspaceId: "other-workspace",
    },
  });
  return {
    bearerGuard: new HttpBearerGuard(authenticator),
    workspaceAuthorizer: new DefaultWorkspaceAuthorizer(),
  };
}

function bearerHeaders(
  token: string = TEST_API_KEY,
  extra: Record<string, string> = {},
): Record<string, string> {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function buildController(
  runtime: KnowledgeRuntime,
): CitedGroundedAnswerController {
  const { bearerGuard, workspaceAuthorizer } = buildAuth();
  return new CitedGroundedAnswerController(
    runtime,
    bearerGuard,
    workspaceAuthorizer,
  );
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
  console.log("[api] HealthController GET /health returns ok without auth...");
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
  const controller = buildController(runtime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(TEST_API_KEY, {
      "content-type": "application/json",
    }),
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

async function assertUnauthorizedWithoutBearer(): Promise<void> {
  console.log(
    "[api] CitedGroundedAnswerController returns 401 when Bearer token is missing...",
  );
  const { runtime } = await seedRuntime();
  const controller = buildController(runtime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "aaaaaaaa" },
  });
  assertEqual(response.status, 401, "status");
  assertEqual(
    (response.body as { error: string }).error,
    "Missing or invalid Authorization bearer token",
    "error",
  );
}

async function assertUnauthorizedOnBadToken(): Promise<void> {
  console.log(
    "[api] CitedGroundedAnswerController returns 401 on unknown Bearer token...",
  );
  const { runtime } = await seedRuntime();
  const controller = buildController(runtime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders("unknown-token"),
    body: { query: "aaaaaaaa" },
  });
  assertEqual(response.status, 401, "status");
  assertEqual(
    (response.body as { error: string }).error,
    "Authentication failed",
    "error",
  );
}

async function assertForbiddenOnMismatch(): Promise<void> {
  console.log(
    "[api] CitedGroundedAnswerController returns 403 on workspace mismatch...",
  );
  const { runtime } = await seedRuntime();
  const controller = buildController(runtime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(OTHER_WORKSPACE_KEY),
    body: { query: "aaaaaaaa" },
  });
  assertEqual(response.status, 403, "status");
  assertEqual(
    (response.body as { error: string }).error,
    "Workspace access denied",
    "error",
  );
}

async function assertInvalidInput400(): Promise<void> {
  console.log("[api] CitedGroundedAnswerController rejects invalid input with 400...");
  const { runtime } = await seedRuntime();
  const controller = buildController(runtime);

  const missingQuery = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(),
    body: {},
  });
  assertEqual(missingQuery.status, 400, "missing query");

  const badBody = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(),
    body: "nope",
  });
  assertEqual(badBody.status, 400, "non-object body");
}

async function assertMethodNotAllowed(): Promise<void> {
  console.log("[api] CitedGroundedAnswerController returns 405 for non-POST...");
  const { runtime } = await seedRuntime();
  const controller = buildController(runtime);
  const response = await controller.create({
    method: "GET",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(),
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
  const controller = buildController(failingRuntime);
  const response = await controller.create({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(),
    body: { query: "q" },
  });
  assertEqual(response.status, 500, "status");
  assertEqual((response.body as { error: string }).error, "boom", "error");
}

async function assertRouterWiresHealthAndCitedAnswer(): Promise<void> {
  console.log(
    "[api] createKnowledgeHttpRouter wires health (no auth) and cited-answer (Bearer AuthN)...",
  );
  const { runtime } = await seedRuntime();
  const { bearerGuard, workspaceAuthorizer } = buildAuth();
  const router = createKnowledgeHttpRouter(
    runtime,
    bearerGuard,
    workspaceAuthorizer,
  );

  const health = await router.handle({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(health.status, 200, "health");

  const cited = await router.handle({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: bearerHeaders(),
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(cited.status, 200, "cited-answer");
}

function assertControllerDependsOnlyOnPorts(): void {
  console.log(
    "[api] CitedGroundedAnswerController imports KnowledgeRuntime, HttpBearerGuard, WorkspaceAuthorizer — not concrete adapters...",
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
    "DefaultWorkspaceAuthorizer",
    "ApiKeyAuthenticator",
    "HttpWorkspaceGuard",
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
  assertTruthy(
    source.includes('from "../security/HttpBearerGuard"'),
    "must import HttpBearerGuard",
  );
  assertTruthy(
    source.includes('from "../security/WorkspaceAuthorizer"'),
    "must import WorkspaceAuthorizer",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertHealth();
  await assertCitedAnswerSuccess();
  await assertUnauthorizedWithoutBearer();
  await assertUnauthorizedOnBadToken();
  await assertForbiddenOnMismatch();
  await assertInvalidInput400();
  await assertMethodNotAllowed();
  await assertRuntimeThrow500();
  await assertRouterWiresHealthAndCitedAnswer();
  assertControllerDependsOnlyOnPorts();
  console.log("CitedGroundedAnswerController validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
