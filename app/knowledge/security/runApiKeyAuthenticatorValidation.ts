import { ApiKeyAuthenticator } from "./ApiKeyAuthenticator";
import { KNOWLEDGE_MODULE_SECURITY } from "./index";

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

async function assertRejects(
  promise: Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await promise;
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected rejection containing: ${messageSubstring}`);
}

function assertModuleConstant(): void {
  assertEqual(
    KNOWLEDGE_MODULE_SECURITY,
    "app/knowledge/security",
    "module constant",
  );
}

async function assertAuthenticateAndDefensiveCopy(): Promise<void> {
  console.log("[security] ApiKeyAuthenticator authenticate + defensive copy...");
  const authenticator = new ApiKeyAuthenticator({
    "key-1": { subject: "alice", workspaceId: "workspace-a" },
  });
  const principal = await authenticator.authenticate({ token: "key-1" });
  assertEqual(principal.subject, "alice", "subject");
  assertEqual(principal.workspaceId, "workspace-a", "workspaceId");
  principal.subject = "mutated";
  const again = await authenticator.authenticate({ token: "key-1" });
  assertEqual(again.subject, "alice", "defensive");
}

async function assertFailuresAndConstruction(): Promise<void> {
  console.log("[security] ApiKeyAuthenticator rejects unknown/empty/invalid...");
  const authenticator = new ApiKeyAuthenticator({
    "key-1": { subject: "alice", workspaceId: "workspace-a" },
  });
  await assertRejects(
    authenticator.authenticate({ token: "missing" }),
    "Authentication failed",
  );
  await assertRejects(
    authenticator.authenticate({ token: " " }),
    "Authentication failed",
  );
  let caught: unknown;
  try {
    new ApiKeyAuthenticator({
      "key-2": { subject: " ", workspaceId: "workspace-a" },
    });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "invalid subject must throw");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertAuthenticateAndDefensiveCopy();
  await assertFailuresAndConstruction();
  console.log("ApiKeyAuthenticator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
