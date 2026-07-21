import {
  createSign,
  generateKeyPairSync,
  type KeyObject,
} from "node:crypto";

import { FakeJwksHttpTransport } from "./FakeJwksHttpTransport";
import { JWT_CLAIM_WORKSPACE_ID } from "./JwtClaims";
import { Rs256JwtAuthenticator } from "./Rs256JwtAuthenticator";
import { Rs256JwtVerifier } from "./Rs256JwtVerifier";
import { base64UrlEncode } from "./Hs256JwtVerifier";

const NOW = 1_700_000_000;
const KID = "test-rsa-kid";

type TestKeyMaterial = {
  privateKey: KeyObject;
  jwksUrl: string;
  transport: FakeJwksHttpTransport;
};

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

function createTestKeyMaterial(): TestKeyMaterial {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" }) as {
    kty: "RSA";
    n: string;
    e: string;
  };
  const jwksUrl = "https://issuer.example.com/.well-known/jwks.json";
  const transport = new FakeJwksHttpTransport({
    keys: [
      {
        kid: KID,
        kty: "RSA",
        n: jwk.n,
        e: jwk.e,
        alg: "RS256",
        use: "sig",
      },
    ],
  });
  return { privateKey, jwksUrl, transport };
}

function signRs256Jwt(
  privateKey: KeyObject,
  payload: Record<string, unknown>,
  kid: string = KID,
): string {
  const header = { alg: "RS256", typ: "JWT", kid };
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function validPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    sub: "user-rs256",
    [JWT_CLAIM_WORKSPACE_ID]: "workspace-b",
    iss: "issuer-rs256",
    aud: "audience-rs256",
    exp: NOW + 3600,
    nbf: NOW - 60,
    ...overrides,
  };
}

async function assertValidRs256Token(): Promise<void> {
  console.log("[security] Rs256JwtAuthenticator accepts valid JWT...");
  const material = createTestKeyMaterial();
  const token = signRs256Jwt(material.privateKey, validPayload());
  const verifier = new Rs256JwtVerifier(
    {
      type: "jwks",
      jwksUrl: material.jwksUrl,
      issuer: "issuer-rs256",
      audience: "audience-rs256",
    },
    material.transport,
    { nowSeconds: () => NOW },
  );
  const authenticator = new Rs256JwtAuthenticator(verifier);
  const principal = await authenticator.authenticate({ token });
  assertEqual(principal.subject, "user-rs256", "subject");
  assertEqual(principal.workspaceId, "workspace-b", "workspaceId");
}

async function assertWrongSignatureRejected(): Promise<void> {
  console.log("[security] Rs256JwtVerifier rejects tampered signature...");
  const material = createTestKeyMaterial();
  const other = createTestKeyMaterial();
  const token = signRs256Jwt(other.privateKey, validPayload());
  const verifier = new Rs256JwtVerifier(
    { type: "jwks", jwksUrl: material.jwksUrl },
    material.transport,
    { nowSeconds: () => NOW },
  );
  await assertThrowsAsync(
    () => verifier.verify(token),
    "Authentication failed",
  );
}

async function assertUnknownKidRefetchesJwks(): Promise<void> {
  console.log("[security] Rs256JwtVerifier refetches JWKS on unknown kid...");
  const material = createTestKeyMaterial();
  const token = signRs256Jwt(material.privateKey, validPayload(), "missing-kid");
  const verifier = new Rs256JwtVerifier(
    { type: "jwks", jwksUrl: material.jwksUrl },
    material.transport,
    { nowSeconds: () => NOW },
  );
  await assertThrowsAsync(
    () => verifier.verify(token),
    "Authentication failed",
  );
  assertEqual(material.transport.requests.length, 2, "fetch count");
}

async function assertExpiredRejected(): Promise<void> {
  console.log("[security] Rs256JwtVerifier rejects expired token...");
  const material = createTestKeyMaterial();
  const token = signRs256Jwt(
    material.privateKey,
    validPayload({ exp: NOW - 1 }),
  );
  const verifier = new Rs256JwtVerifier(
    { type: "jwks", jwksUrl: material.jwksUrl },
    material.transport,
    { nowSeconds: () => NOW },
  );
  await assertThrowsAsync(
    () => verifier.verify(token),
    "Authentication failed",
  );
}

async function main(): Promise<void> {
  await assertValidRs256Token();
  await assertWrongSignatureRejected();
  await assertUnknownKidRefetchesJwks();
  await assertExpiredRejected();
  console.log("Rs256JwtAuthenticator validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
