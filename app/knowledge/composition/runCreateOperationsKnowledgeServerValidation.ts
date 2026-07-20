import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { IN_MEMORY_SERVER_TEST_API_KEY } from "./createInMemoryKnowledgeServer";
import { createOperationsKnowledgeServer } from "./createOperationsKnowledgeServer";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

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

async function seed(
  composition: ReturnType<typeof createOperationsKnowledgeServer>["composition"],
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

function assertModuleConstant(): void {
  console.log(
    "[composition] KNOWLEDGE_MODULE_COMPOSITION constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_COMPOSITION,
    "app/knowledge/composition",
    "module constant",
  );
}

async function assertOperationsServerDispatch(): Promise<void> {
  console.log(
    "[composition] createOperationsKnowledgeServer dispatches health/cited-answer with logs and metrics...",
  );
  const { server, composition, logger, metrics } =
    createOperationsKnowledgeServer();
  await seed(composition);
  await server.start();

  const health = await server.dispatch({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(health.status, 200, "health");

  const cited = await server.dispatch({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: { Authorization: `Bearer ${IN_MEMORY_SERVER_TEST_API_KEY}` },
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(cited.status, 200, "cited-answer");

  const events = logger.getEvents();
  assertTruthy(
    events.some((event) => event.message === "http.request.start"),
    "start logs present",
  );
  assertTruthy(
    events.some((event) => event.message === "http.request.finish"),
    "finish logs present",
  );
  assertTruthy(metrics.getPoints().length >= 1, "metrics recorded");

  await server.stop();
}

async function assertUnauthorizedWithoutBearer(): Promise<void> {
  console.log(
    "[composition] operations server enforces Bearer AuthN on cited-answer...",
  );
  const { server } = createOperationsKnowledgeServer();
  await server.start();
  const response = await server.dispatch({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "aaaaaaaa" },
  });
  assertEqual(response.status, 401, "unauthorized");
  await server.stop();
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertOperationsServerDispatch();
  await assertUnauthorizedWithoutBearer();
  console.log("createOperationsKnowledgeServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
