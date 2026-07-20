import { createListeningOperationsServer } from "./createListeningOperationsServer";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

const WORKSPACE_A = "workspace-a";
const TEST_API_KEY = "test-api-key";

const TEST_API_KEYS = {
  [TEST_API_KEY]: { subject: "test-user", workspaceId: WORKSPACE_A },
} as const;

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

async function main(): Promise<void> {
  assertModuleConstant();
  await assertEphemeralHealth();
  await assertCitedAnswerRequiresBearer();
  console.log("createListeningOperationsServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
