import { readFileSync } from "node:fs";
import path from "node:path";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createInMemoryKnowledgeServer } from "../composition/createInMemoryKnowledgeServer";
import { DefaultHttpRouter } from "../http/DefaultHttpRouter";
import { DefaultKnowledgeServer } from "./DefaultKnowledgeServer";
import { KNOWLEDGE_MODULE_SERVER } from "./index";

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

async function seedComposition(
  composition: ReturnType<typeof createInMemoryKnowledgeServer>["composition"],
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
  console.log("[server] KNOWLEDGE_MODULE_SERVER constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_SERVER,
    "app/knowledge/server",
    "unexpected module constant",
  );
}

async function assertStartStopLifecycle(): Promise<void> {
  console.log("[server] DefaultKnowledgeServer start/stop lifecycle...");
  const router = new DefaultHttpRouter([]);
  const server = new DefaultKnowledgeServer(router);
  assertEqual(server.isRunning(), false, "initially stopped");
  await server.start();
  assertEqual(server.isRunning(), true, "running after start");
  let doubleStartThrew = false;
  try {
    await server.start();
  } catch {
    doubleStartThrew = true;
  }
  assertTruthy(doubleStartThrew, "second start must throw");
  await server.stop();
  assertEqual(server.isRunning(), false, "stopped after stop");
  let doubleStopThrew = false;
  try {
    await server.stop();
  } catch {
    doubleStopThrew = true;
  }
  assertTruthy(doubleStopThrew, "second stop must throw");
}

async function assertDispatchBeforeStartRejected(): Promise<void> {
  console.log("[server] dispatch before start is rejected...");
  const router = new DefaultHttpRouter([
    {
      method: "GET",
      path: "/health",
      handler: async () => ({
        status: 200,
        headers: { "content-type": "application/json" },
        body: { status: "ok" },
      }),
    },
  ]);
  const server = new DefaultKnowledgeServer(router);
  let threw = false;
  try {
    await server.dispatch({ method: "GET", path: "/health", headers: {} });
  } catch {
    threw = true;
  }
  assertTruthy(threw, "dispatch before start must throw");
}

async function assertHealthAndCitedAnswerDispatch(): Promise<void> {
  console.log(
    "[server] in-memory server dispatches health and cited-answer successfully...",
  );
  const { server, composition } = createInMemoryKnowledgeServer();
  await seedComposition(composition);
  await server.start();

  const health = await server.dispatch({
    method: "GET",
    path: "/health",
    headers: {},
  });
  assertEqual(health.status, 200, "health status");
  assertEqual((health.body as { status: string }).status, "ok", "health body");

  const cited = await server.dispatch({
    method: "POST",
    path: `/workspaces/${WORKSPACE_A}/cited-answers`,
    headers: {},
    body: { query: "aaaaaaaa", retrievalLimit: 5, maxCharacters: 10_000 },
  });
  assertEqual(cited.status, 200, "cited-answer status");
  assertTruthy(
    Array.isArray((cited.body as { citations: unknown[] }).citations),
    "citations array",
  );

  await server.stop();
}

function assertNoNetworkListen(): void {
  console.log(
    "[server] DefaultKnowledgeServer source does not perform network listen...",
  );
  const source = readFileSync(
    path.resolve(process.cwd(), "app/knowledge/server/DefaultKnowledgeServer.ts"),
    "utf8",
  );
  const forbidden = [
    "node:http",
    "createServer",
    ".listen(",
    "express",
    "fastify",
    "net.",
  ];
  for (const reference of forbidden) {
    assertTruthy(
      !source.includes(reference),
      `DefaultKnowledgeServer must not reference "${reference}"`,
    );
  }
}

function assertDependsOnlyOnHttpRouter(): void {
  console.log(
    "[server] DefaultKnowledgeServer depends only on HttpRouter...",
  );
  const source = readFileSync(
    path.resolve(process.cwd(), "app/knowledge/server/DefaultKnowledgeServer.ts"),
    "utf8",
  );
  assertTruthy(
    source.includes('from "../http/HttpRouter"'),
    "must import HttpRouter",
  );
  const forbidden = [
    "createInMemoryKnowledgeComposition",
    "KnowledgeRuntime",
    "createKnowledgeHttpRouter",
  ];
  for (const reference of forbidden) {
    assertTruthy(
      !source.includes(reference),
      `DefaultKnowledgeServer must not reference "${reference}"`,
    );
  }
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertStartStopLifecycle();
  await assertDispatchBeforeStartRejected();
  await assertHealthAndCitedAnswerDispatch();
  assertNoNetworkListen();
  assertDependsOnlyOnHttpRouter();
  console.log("DefaultKnowledgeServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
