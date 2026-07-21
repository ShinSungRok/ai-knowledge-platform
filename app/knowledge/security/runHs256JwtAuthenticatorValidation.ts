import { JWT_CLAIM_WORKSPACE_ID } from "./JwtClaims";
import { Hs256JwtAuthenticator } from "./Hs256JwtAuthenticator";
import {
  Hs256JwtVerifier,
  signHs256Jwt,
} from "./Hs256JwtVerifier";

const SECRET = "test-hs256-secret";
const NOW = 1_700_000_000;

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

async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  messageSubstring: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    assertTruthy(
      text.includes(messageSubstring),
      `Expected error including "${messageSubstring}", got: ${text}`,
    );
    return;
  }
  throw new Error(`Expected throw containing: ${messageSubstring}`);
}

function makeVerifier(
  overrides: Partial<{
    issuer: string;
    audience: string;
  }> = {},
): Hs256JwtVerifier {
  return new Hs256JwtVerifier(
    {
      type: "hs256",
      secret: SECRET,
      issuer: overrides.issuer,
      audience: overrides.audience,
    },
    { nowSeconds: () => NOW },
  );
}

function validPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sub: "user-1",
    [JWT_CLAIM_WORKSPACE_ID]: "workspace-a",
    iss: "issuer-a",
    aud: "audience-a",
    exp: NOW + 3600,
    nbf: NOW - 60,
    ...overrides,
  };
}

async function assertValidTokenAuthenticates(): Promise<void> {
  console.log("[security] Hs256JwtAuthenticator accepts valid JWT...");
  const token = signHs256Jwt(validPayload(), SECRET);
  const authenticator = new Hs256JwtAuthenticator(makeVerifier({
    issuer: "issuer-a",
    audience: "audience-a",
  }));
  const principal = await authenticator.authenticate({ token });
  assertEqual(principal.subject, "user-1", "subject");
  assertEqual(principal.workspaceId, "workspace-a", "workspaceId");
}

async function assertWrongSignatureRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects wrong signature...");
  const token = signHs256Jwt(validPayload(), "other-secret");
  await assertThrowsAsync(
    () => makeVerifier().verify(token),
    "Authentication failed",
  );
}

async function assertExpiredRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects expired token...");
  const token = signHs256Jwt(
    validPayload({ exp: NOW - 1 }),
    SECRET,
  );
  await assertThrowsAsync(
    () => makeVerifier().verify(token),
    "Authentication failed",
  );
}

async function assertWrongIssuerRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects wrong issuer...");
  const token = signHs256Jwt(validPayload({ iss: "wrong" }), SECRET);
  await assertThrowsAsync(
    () => makeVerifier({ issuer: "issuer-a" }).verify(token),
    "Authentication failed",
  );
}

async function assertWrongAudienceRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects wrong audience...");
  const token = signHs256Jwt(validPayload({ aud: "wrong" }), SECRET);
  await assertThrowsAsync(
    () =>
      makeVerifier({ issuer: "issuer-a", audience: "audience-a" }).verify(
        token,
      ),
    "Authentication failed",
  );
}

async function assertMissingWorkspaceClaimRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects missing workspace claim...");
  const payload = validPayload();
  delete payload[JWT_CLAIM_WORKSPACE_ID];
  const token = signHs256Jwt(payload, SECRET);
  await assertThrowsAsync(
    () => makeVerifier().verify(token),
    "Authentication failed",
  );
}

async function assertNonHs256AlgorithmRejected(): Promise<void> {
  console.log("[security] Hs256JwtVerifier rejects non-HS256 alg...");
  const token = signHs256Jwt(
    validPayload(),
    SECRET,
    { alg: "RS256", typ: "JWT" },
  );
  await assertThrowsAsync(
    () => makeVerifier().verify(token),
    "Authentication failed",
  );
}

async function main(): Promise<void> {
  await assertValidTokenAuthenticates();
  await assertWrongSignatureRejected();
  await assertExpiredRejected();
  await assertWrongIssuerRejected();
  await assertWrongAudienceRejected();
  await assertMissingWorkspaceClaimRejected();
  await assertNonHs256AlgorithmRejected();
  console.log("Hs256JwtAuthenticator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
