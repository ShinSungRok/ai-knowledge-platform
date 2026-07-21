import { FetchJwksHttpTransport } from "./FetchJwksHttpTransport";
import { loadJwtAuthConfig } from "./loadJwtAuthConfig";
import { Rs256JwtAuthenticator } from "./Rs256JwtAuthenticator";
import { Rs256JwtVerifier } from "./Rs256JwtVerifier";

/**
 * Optional live JWKS JWT check.
 * Skips (exit 0) when `JWT_JWKS_URL` is unset. Not in top-level validate.
 */
async function main(): Promise<void> {
  const config = loadJwtAuthConfig(process.env);
  if (config === null || config.type !== "jwks") {
    console.log(
      "[security] JWT_JWKS_URL unset — skipping live JWT auth validation.",
    );
    return;
  }

  const verifier = new Rs256JwtVerifier(
    config,
    new FetchJwksHttpTransport(),
  );
  const authenticator = new Rs256JwtAuthenticator(verifier);
  const token = process.env["JWT_LIVE_TOKEN"];
  if (token === undefined || token.trim().length === 0) {
    console.log(
      "[security] JWT_LIVE_TOKEN unset — JWKS config present but no token to verify.",
    );
    return;
  }
  const principal = await authenticator.authenticate({ token: token.trim() });
  if (
    typeof principal.subject !== "string" ||
    typeof principal.workspaceId !== "string"
  ) {
    throw new Error("live JWT auth returned invalid principal");
  }
  console.log("JWT auth live validation succeeded.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
