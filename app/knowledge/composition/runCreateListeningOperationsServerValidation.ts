import type { DocumentChunk } from "../domain/DocumentChunk";
import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import { FakeEmbeddingProvider } from "../embedding/FakeEmbeddingProvider";
import { createListeningOperationsServer } from "./createListeningOperationsServer";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

const WORKSPACE_A = "workspace-a";
const TEST_API_KEY = "test-api-key";

const TEST_API_KEYS = {
  [TEST_API_KEY]: { subject: "test-user", workspaceId: WORKSPACE_A },
} as const;

async function seed(
  composition: ReturnType<typeof createListeningOperationsServer>["composition"],
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

async function assertEphemeralHealth(): Promise<void> {
  console.log(
    "[composition] createListeningOperationsServer ephemeral /health...",
  );
  const server = createListeningOperationsServer({ apiKeys: TEST_API_KEYS });
  assertEqual(
    server.listener.constructor.name,
    "NodeHttpListener",
    "NodeHttpListener",
  );
  try {
    const address = await server.start();
    assertEqual(address.host, "127.0.0.1", "host");
    assertTruthy(address.port > 0, "bound port");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assertEqual(response.status, 200, "status");
    const body = (await response.json()) as { status?: string };
    assertEqual(body.status, "ok", "body");
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }
}

async function assertCitedAnswerRequiresBearer(): Promise<void> {
  console.log(
    "[composition] listening cited-answer requires Authorization Bearer...",
  );
  const server = createListeningOperationsServer({ apiKeys: TEST_API_KEYS });
  try {
    const address = await server.start();
    const unauthorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/cited-answers`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "aaaaaaaa" }),
      },
    );
    assertEqual(unauthorized.status, 401, "missing bearer → 401");

    const authorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/cited-answers`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: JSON.stringify({ query: "aaaaaaaa" }),
      },
    );
    assertTruthy(
      authorized.status !== 401 && authorized.status !== 403,
      `authorized must pass AuthN/AuthZ (got ${authorized.status})`,
    );
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }
}

async function assertMcpToolsOverHttp(): Promise<void> {
  console.log(
    "[composition] listening POST /mcp tools/list and tools/call with Bearer...",
  );
  const server = createListeningOperationsServer({ apiKeys: TEST_API_KEYS });
  try {
    await seed(server.composition);
    const address = await server.start();
    const unauthorized = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });
    assertEqual(unauthorized.status, 401, "mcp without bearer → 401");

    const listResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
      }),
    });
    assertEqual(listResponse.status, 200, "tools/list status");
    const listBody = (await listResponse.json()) as {
      result?: { tools?: Array<{ name: string }> };
    };
    assertTruthy(
      Array.isArray(listBody.result?.tools) &&
        listBody.result!.tools!.some(
          (tool) => tool.name === "generate_cited_grounded_answer",
        ),
      "tool listed",
    );

    const callResponse = await fetch(`http://127.0.0.1:${address.port}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${TEST_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "generate_cited_grounded_answer",
          arguments: {
            workspaceId: WORKSPACE_A,
            query: "aaaaaaaa",
            retrievalLimit: 5,
            maxCharacters: 10_000,
          },
        },
      }),
    });
    assertEqual(callResponse.status, 200, "tools/call status");
    const callBody = (await callResponse.json()) as {
      result?: { isError?: boolean };
      error?: unknown;
    };
    assertEqual(callBody.error, undefined, "no json-rpc error");
    assertEqual(callBody.result?.isError, false, "tool ok");
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }
}

async function assertWorkflowRunsOverHttp(): Promise<void> {
  console.log(
    "[composition] createListeningOperationsServer workflow-runs Bearer + 200...",
  );
  const server = createListeningOperationsServer({ apiKeys: TEST_API_KEYS });
  try {
    const address = await server.start();
    const unauthorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objective: "summarize policy" }),
      },
    );
    assertEqual(unauthorized.status, 401, "workflow 401");

    const authorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: JSON.stringify({ objective: "summarize policy" }),
      },
    );
    assertEqual(authorized.status, 200, "workflow 200");
    const body = (await authorized.json()) as { status?: string };
    assertEqual(body.status, "completed", "workflow completed");
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertEphemeralHealth();
  await assertCitedAnswerRequiresBearer();
  await assertMcpToolsOverHttp();
  await assertWorkflowRunsOverHttp();
  console.log("createListeningOperationsServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
