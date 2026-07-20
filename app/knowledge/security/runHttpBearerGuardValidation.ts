import type { Authenticator } from "./Authenticator";
import type { AuthPrincipal } from "./AuthPrincipal";
import { HttpBearerGuard } from "./HttpBearerGuard";

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

class StubAuthenticator implements Authenticator {
  lastToken: string | undefined;
  principal: AuthPrincipal = { subject: "bob", workspaceId: "workspace-b" };

  async authenticate(credentials: { token: string }): Promise<AuthPrincipal> {
    this.lastToken = credentials.token;
    if (credentials.token !== "good-token") {
      throw new Error("Authentication failed");
    }
    return { ...this.principal };
  }
}

async function assertBearerSuccess(): Promise<void> {
  console.log("[security] HttpBearerGuard parses Bearer and authenticates...");
  const authenticator = new StubAuthenticator();
  const guard = new HttpBearerGuard(authenticator);
  const principal = await guard.authenticateRequest({
    method: "POST",
    path: "/workspaces/workspace-b/cited-answers",
    headers: { Authorization: "Bearer good-token" },
    body: {},
  });
  assertEqual(authenticator.lastToken, "good-token", "token");
  assertEqual(principal.subject, "bob", "subject");
}

async function assertCaseInsensitiveHeader(): Promise<void> {
  console.log("[security] HttpBearerGuard matches authorization case-insensitively...");
  const authenticator = new StubAuthenticator();
  const guard = new HttpBearerGuard(authenticator);
  await guard.authenticateRequest({
    method: "POST",
    path: "/x",
    headers: { authorization: "Bearer good-token" },
  });
  assertEqual(authenticator.lastToken, "good-token", "lower header");
}

async function assertMalformed(): Promise<void> {
  console.log("[security] HttpBearerGuard rejects missing/malformed Authorization...");
  const guard = new HttpBearerGuard(new StubAuthenticator());
  await assertRejects(
    guard.authenticateRequest({
      method: "POST",
      path: "/x",
      headers: {},
    }),
    "Missing or invalid Authorization bearer token",
  );
  await assertRejects(
    guard.authenticateRequest({
      method: "POST",
      path: "/x",
      headers: { Authorization: "Basic abc" },
    }),
    "Missing or invalid Authorization bearer token",
  );
  await assertRejects(
    guard.authenticateRequest({
      method: "POST",
      path: "/x",
      headers: { Authorization: "Bearer bad-token" },
    }),
    "Authentication failed",
  );
}

async function main(): Promise<void> {
  await assertBearerSuccess();
  await assertCaseInsensitiveHeader();
  await assertMalformed();
  console.log("HttpBearerGuard validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
