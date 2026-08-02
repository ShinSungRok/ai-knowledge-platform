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
    const body = (await authorized.json()) as {
      status?: string;
      workflowRunId?: string;
    };
    assertEqual(body.status, "completed", "workflow completed");
    assertTruthy(
      typeof body.workflowRunId === "string" && body.workflowRunId.length > 0,
      "workflow run id present",
    );

    console.log(
      "[composition] ...and the returned run is fetchable via GET workflow-runs/:id + /memory...",
    );
    const getByIdResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs/${body.workflowRunId}`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(getByIdResponse.status, 200, "getById 200");
    const getByIdBody = (await getByIdResponse.json()) as {
      status?: string;
      workflowRunId?: string;
    };
    assertEqual(getByIdBody.status, "completed", "getById status matches");
    assertEqual(
      getByIdBody.workflowRunId,
      body.workflowRunId,
      "getById run id matches",
    );

    const getMemoryResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs/${body.workflowRunId}/memory`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(getMemoryResponse.status, 200, "getMemory 200");
    const getMemoryBody = (await getMemoryResponse.json()) as {
      entries?: readonly unknown[];
    };
    assertTruthy(
      Array.isArray(getMemoryBody.entries) && getMemoryBody.entries.length > 0,
      "non-empty memory entries",
    );

    const getByIdUnknown = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs/does-not-exist`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(getByIdUnknown.status, 404, "getById unknown id 404");

    const getByIdNoBearer = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-runs/${body.workflowRunId}`,
    );
    assertEqual(getByIdNoBearer.status, 401, "getById no bearer 401");

    console.log(
      "[composition] ...and GET workflow-agents exposes the Role Contract registry...",
    );
    const workflowAgentsResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-agents`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(workflowAgentsResponse.status, 200, "workflow-agents 200");
    const workflowAgentsBody = (await workflowAgentsResponse.json()) as {
      agents?: readonly unknown[];
    };
    assertTruthy(
      Array.isArray(workflowAgentsBody.agents) &&
        workflowAgentsBody.agents.length === 3,
      "3 workflow agents",
    );

    const workflowAgentsNoBearer = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/workflow-agents`,
    );
    assertEqual(workflowAgentsNoBearer.status, 401, "workflow-agents no bearer 401");
  } finally {
    if (server.listener.isListening()) {
      await server.stop();
    }
  }
}

async function assertLlmopsControlPlaneOverHttp(): Promise<void> {
  console.log(
    "[composition] createListeningOperationsServer llmops/control-plane Bearer + 200...",
  );
  const server = createListeningOperationsServer({ apiKeys: TEST_API_KEYS });
  try {
    const address = await server.start();
    const unauthorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/control-plane`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    assertEqual(unauthorized.status, 401, "llmops 401");

    const authorized = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/control-plane`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: JSON.stringify({}),
      },
    );
    assertEqual(authorized.status, 200, "llmops 200");
    const body = (await authorized.json()) as {
      gatePassed?: boolean;
      regressionPassed?: boolean;
      runStatus?: string;
      experimentRunId?: string;
    };
    assertEqual(body.gatePassed, true, "gate");
    assertEqual(body.regressionPassed, true, "regression");
    assertEqual(body.runStatus, "completed", "run status");

    console.log(
      "[composition] ...GET llmops/experiment-runs/:id reflects the persisted run...",
    );
    const runResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/experiment-runs/${body.experimentRunId}`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(runResponse.status, 200, "experiment-runs getById 200");
    const runBody = (await runResponse.json()) as { status?: string };
    assertEqual(runBody.status, "completed", "persisted run status");

    console.log(
      "[composition] ...calling llmops/control-plane again accumulates real history (persistent stores)...",
    );
    const second = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/control-plane`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${TEST_API_KEY}`,
        },
        body: JSON.stringify({}),
      },
    );
    assertEqual(second.status, 200, "second llmops 200");

    const promptsResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/prompts`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(promptsResponse.status, 200, "prompts 200");
    const promptsBody = (await promptsResponse.json()) as {
      templates?: readonly unknown[];
    };
    assertEqual(promptsBody.templates?.length, 2, "two accumulated templates");

    const modelsResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/models`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(modelsResponse.status, 200, "models 200");
    const modelsBody = (await modelsResponse.json()) as {
      models?: readonly unknown[];
    };
    assertEqual(modelsBody.models?.length, 2, "two accumulated models");

    const gatesResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/evaluation-gates`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(gatesResponse.status, 200, "evaluation-gates 200");
    const gatesBody = (await gatesResponse.json()) as {
      gates?: readonly { id?: string }[];
    };
    assertEqual(
      gatesBody.gates?.length,
      1,
      "default gate definition reused across both calls, not duplicated",
    );
    assertEqual(gatesBody.gates?.[0]?.id, "gate-def-default", "default gate id");

    const servingResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/serving-configs`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(servingResponse.status, 200, "serving-configs 200");
    const servingBody = (await servingResponse.json()) as {
      servingConfigs?: readonly unknown[];
    };
    assertEqual(servingBody.servingConfigs?.length, 2, "two accumulated serving configs");

    const observationsResponse = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/observations`,
      { headers: { Authorization: `Bearer ${TEST_API_KEY}` } },
    );
    assertEqual(observationsResponse.status, 200, "observations 200");
    const observationsBody = (await observationsResponse.json()) as {
      observations?: readonly unknown[];
    };
    assertEqual(
      observationsBody.observations?.length,
      2,
      "two accumulated observations",
    );

    const noBearerPrompts = await fetch(
      `http://127.0.0.1:${address.port}/workspaces/${WORKSPACE_A}/llmops/prompts`,
    );
    assertEqual(noBearerPrompts.status, 401, "prompts no bearer 401");
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
  await assertLlmopsControlPlaneOverHttp();
  console.log("createListeningOperationsServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
