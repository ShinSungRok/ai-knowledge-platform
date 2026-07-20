import type { HttpListenAddress } from "./HttpListenAddress";
import type { HttpListenConfig } from "./HttpListenConfig";
import type { HttpListener } from "./HttpListener";
import { KNOWLEDGE_MODULE_SERVER } from "./index";

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

/**
 * In-memory {@link HttpListener} for contract validation (no sockets).
 */
class FakeHttpListener implements HttpListener {
  private listening = false;
  private address: HttpListenAddress | null = null;

  async listen(config: HttpListenConfig): Promise<HttpListenAddress> {
    if (this.listening) {
      throw new Error("HttpListener is already listening");
    }
    if (typeof config.host !== "string" || config.host.trim().length === 0) {
      throw new Error("host must be a non-empty string");
    }
    if (typeof config.port !== "number" || !Number.isInteger(config.port) || config.port < 0) {
      throw new Error("port must be a non-negative integer");
    }
    const boundPort = config.port === 0 ? 34567 : config.port;
    this.address = { host: config.host, port: boundPort };
    this.listening = true;
    return { ...this.address };
  }

  async close(): Promise<void> {
    if (!this.listening) {
      throw new Error("HttpListener is not listening");
    }
    this.listening = false;
    this.address = null;
  }

  isListening(): boolean {
    return this.listening;
  }
}

function assertModuleConstant(): void {
  console.log("[server] KNOWLEDGE_MODULE_SERVER constant is exported correctly...");
  assertEqual(
    KNOWLEDGE_MODULE_SERVER,
    "app/knowledge/server",
    "module constant",
  );
}

async function assertFakeListenerLifecycle(): Promise<void> {
  console.log("[server] FakeHttpListener listen/close/isListening...");
  const listener: HttpListener = new FakeHttpListener();
  assertEqual(listener.isListening(), false, "before listen");
  const address = await listener.listen({ host: "127.0.0.1", port: 0 });
  assertEqual(address.host, "127.0.0.1", "host");
  assertEqual(address.port, 34567, "ephemeral resolved port");
  assertTruthy(listener.isListening(), "after listen");
  await listener.close();
  assertEqual(listener.isListening(), false, "after close");
}

async function assertDuplicateListenAndCloseThrow(): Promise<void> {
  console.log("[server] FakeHttpListener rejects duplicate listen/close...");
  const listener = new FakeHttpListener();
  await listener.listen({ host: "127.0.0.1", port: 8080 });
  let caught: unknown;
  try {
    await listener.listen({ host: "127.0.0.1", port: 8080 });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "duplicate listen must throw");
  await listener.close();
  caught = undefined;
  try {
    await listener.close();
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "duplicate close must throw");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertFakeListenerLifecycle();
  await assertDuplicateListenAndCloseThrow();
  console.log("HttpListener contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
