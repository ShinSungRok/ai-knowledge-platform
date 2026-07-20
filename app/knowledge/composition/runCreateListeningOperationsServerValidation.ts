import { createListeningOperationsServer } from "./createListeningOperationsServer";
import { KNOWLEDGE_MODULE_COMPOSITION } from "./index";

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
  const server = createListeningOperationsServer();
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

async function main(): Promise<void> {
  assertModuleConstant();
  await assertEphemeralHealth();
  console.log("createListeningOperationsServer validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
