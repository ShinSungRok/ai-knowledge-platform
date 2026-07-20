import type { AuthPrincipal } from "./AuthPrincipal";
import type { Authenticator } from "./Authenticator";
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

/**
 * Fake {@link Authenticator} for contract validation (no HTTP/JWT).
 */
class FakeAuthenticator implements Authenticator {
  constructor(
    private readonly principalsByToken: Readonly<Record<string, AuthPrincipal>>,
  ) {}

  async authenticate(credentials: { token: string }): Promise<AuthPrincipal> {
    const token = credentials?.token;
    if (typeof token !== "string" || token.trim().length === 0) {
      throw new Error("Authentication failed");
    }
    const principal = this.principalsByToken[token];
    if (!principal) {
      throw new Error("Authentication failed");
    }
    return { subject: principal.subject, workspaceId: principal.workspaceId };
  }
}

function assertModuleConstant(): void {
  console.log(
    "[security] KNOWLEDGE_MODULE_SECURITY constant is exported correctly...",
  );
  assertEqual(
    KNOWLEDGE_MODULE_SECURITY,
    "app/knowledge/security",
    "module constant",
  );
}

async function assertAuthenticateSuccess(): Promise<void> {
  console.log("[security] FakeAuthenticator returns principal for known token...");
  const authenticator: Authenticator = new FakeAuthenticator({
    "token-a": { subject: "user-a", workspaceId: "workspace-a" },
  });
  const principal = await authenticator.authenticate({ token: "token-a" });
  assertEqual(principal.subject, "user-a", "subject");
  assertEqual(principal.workspaceId, "workspace-a", "workspaceId");
}

async function assertAuthenticateFailure(): Promise<void> {
  console.log("[security] FakeAuthenticator rejects unknown/empty token...");
  const authenticator = new FakeAuthenticator({
    "token-a": { subject: "user-a", workspaceId: "workspace-a" },
  });
  let caught: unknown;
  try {
    await authenticator.authenticate({ token: "unknown" });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "must throw");
  assertTruthy(
    (caught as Error).message.includes("Authentication failed"),
    "Authentication failed",
  );
  caught = undefined;
  try {
    await authenticator.authenticate({ token: " " });
  } catch (error: unknown) {
    caught = error;
  }
  assertTruthy(caught instanceof Error, "empty must throw");
}

async function main(): Promise<void> {
  assertModuleConstant();
  await assertAuthenticateSuccess();
  await assertAuthenticateFailure();
  console.log("Authentication contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
