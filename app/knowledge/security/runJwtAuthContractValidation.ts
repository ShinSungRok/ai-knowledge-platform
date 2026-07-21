import type { JwtAuthConfig } from "./JwtAuthConfig";
import { JWT_CLAIM_WORKSPACE_ID } from "./JwtClaims";
import type { JwtClaims } from "./JwtClaims";
import type { JwtVerifier } from "./JwtVerifier";
import type { VerifiedJwt } from "./VerifiedJwt";
import { loadJwtAuthConfig } from "./loadJwtAuthConfig";
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

class FakeJwtVerifier implements JwtVerifier {
  readonly calls: string[] = [];

  async verify(token: string): Promise<VerifiedJwt> {
    this.calls.push(token);
    if (token === "valid-token") {
      const claims: JwtClaims = {
        sub: "user-1",
        workspaceId: "workspace-a",
        iss: "test-issuer",
        exp: 9_999_999_999,
      };
      return {
        claims,
        rawPayload: {
          sub: claims.sub,
          [JWT_CLAIM_WORKSPACE_ID]: claims.workspaceId,
          iss: claims.iss,
          exp: claims.exp,
        },
      };
    }
    throw new Error("Authentication failed");
  }
}

function assertModuleConstant(): void {
  console.log("[security] KNOWLEDGE_MODULE_SECURITY constant is exported...");
  assertEqual(
    KNOWLEDGE_MODULE_SECURITY,
    "app/knowledge/security",
    "module constant",
  );
}

function assertWorkspaceClaimConstant(): void {
  console.log("[security] JWT_CLAIM_WORKSPACE_ID constant...");
  assertEqual(JWT_CLAIM_WORKSPACE_ID, "workspace_id", "claim name");
}

function assertConfigNullWhenUnset(): void {
  console.log("[security] loadJwtAuthConfig returns null when unset...");
  assertEqual(loadJwtAuthConfig({}), null, "empty");
  assertEqual(
    loadJwtAuthConfig({ JWT_SECRET: "  ", JWT_JWKS_URL: "  " }),
    null,
    "blank",
  );
}

function assertConfigLoadsHs256(): void {
  console.log("[security] loadJwtAuthConfig loads HS256 from JWT_SECRET...");
  const loaded = loadJwtAuthConfig({
    JWT_SECRET: "super-secret",
    JWT_ISSUER: "issuer-a",
    JWT_AUDIENCE: "audience-a",
  });
  assertTruthy(loaded !== null, "loaded");
  const config = loaded as JwtAuthConfig;
  assertEqual(config.type, "hs256", "type");
  if (config.type !== "hs256") {
    throw new Error("expected hs256");
  }
  assertEqual(config.secret, "super-secret", "secret");
  assertEqual(config.issuer, "issuer-a", "issuer");
  assertEqual(config.audience, "audience-a", "audience");
}

function assertConfigLoadsJwks(): void {
  console.log("[security] loadJwtAuthConfig loads JWKS from JWT_JWKS_URL...");
  const loaded = loadJwtAuthConfig({
    JWT_JWKS_URL: "https://issuer.example.com/.well-known/jwks.json",
    JWT_ISSUER: "issuer-b",
  });
  assertTruthy(loaded !== null, "loaded");
  const config = loaded as JwtAuthConfig;
  assertEqual(config.type, "jwks", "type");
  if (config.type !== "jwks") {
    throw new Error("expected jwks");
  }
  assertEqual(
    config.jwksUrl,
    "https://issuer.example.com/.well-known/jwks.json",
    "jwksUrl",
  );
  assertEqual(config.issuer, "issuer-b", "issuer");
}

function assertSecretTakesPrecedenceOverJwks(): void {
  console.log("[security] JWT_SECRET takes precedence over JWT_JWKS_URL...");
  const loaded = loadJwtAuthConfig({
    JWT_SECRET: "secret",
    JWT_JWKS_URL: "https://example.com/jwks",
  });
  assertEqual(loaded?.type, "hs256", "hs256 wins");
}

async function assertVerifierPort(): Promise<void> {
  console.log("[security] JwtVerifier port is implementable with Fake...");
  const verifier: JwtVerifier = new FakeJwtVerifier();
  const verified = await verifier.verify("valid-token");
  assertEqual(verified.claims.sub, "user-1", "sub");
  assertEqual(verified.claims.workspaceId, "workspace-a", "workspaceId");
  assertEqual(
    verified.rawPayload[JWT_CLAIM_WORKSPACE_ID],
    "workspace-a",
    "raw workspace claim",
  );
}

async function main(): Promise<void> {
  assertModuleConstant();
  assertWorkspaceClaimConstant();
  assertConfigNullWhenUnset();
  assertConfigLoadsHs256();
  assertConfigLoadsJwks();
  assertSecretTakesPrecedenceOverJwks();
  await assertVerifierPort();
  console.log("JWT auth contract validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
