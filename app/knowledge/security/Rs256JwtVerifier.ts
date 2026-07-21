import { createPublicKey, createVerify } from "node:crypto";

import type { JwtAuthConfig } from "./JwtAuthConfig";
import type { JwkRsaPublicKey } from "./JwksDocument";
import type { JwksDocument } from "./JwksDocument";
import type { JwksHttpTransport } from "./JwksHttpTransport";
import type { JwtVerifier } from "./JwtVerifier";
import type { VerifiedJwt } from "./VerifiedJwt";
import {
  base64UrlDecodeToBuffer,
  base64UrlDecodeToString,
  extractJwtClaims,
  parseJsonRecord,
  validateIssuerAudience,
  validateTimeClaims,
} from "./Hs256JwtVerifier";

export type Rs256JwtVerifierOptions = {
  nowSeconds?: () => number;
};

/**
 * RS256 {@link JwtVerifier} with JWKS fetch via {@link JwksHttpTransport}.
 * Uses Node `crypto` only (no JWT/OIDC SDK).
 */
export class Rs256JwtVerifier implements JwtVerifier {
  private readonly config: Extract<JwtAuthConfig, { type: "jwks" }>;
  private readonly nowSeconds: () => number;
  private jwksCache: JwksDocument | null = null;

  constructor(
    config: Extract<JwtAuthConfig, { type: "jwks" }>,
    private readonly transport: JwksHttpTransport,
    options: Rs256JwtVerifierOptions = {},
  ) {
    if (config.type !== "jwks") {
      throw new Error("Rs256JwtVerifier requires jwks config");
    }
    if (typeof config.jwksUrl !== "string" || config.jwksUrl.trim().length === 0) {
      throw new Error("JWKS URL must be a non-empty string");
    }
    this.config = config;
    this.nowSeconds =
      options.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
  }

  async verify(token: string): Promise<VerifiedJwt> {
    if (typeof token !== "string" || token.trim().length === 0) {
      throw new Error("Authentication failed");
    }
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Authentication failed");
    }
    const [headerPart, payloadPart, signaturePart] = parts as [
      string,
      string,
      string,
    ];
    const header = parseJsonRecord(base64UrlDecodeToString(headerPart));
    if (header.alg !== "RS256") {
      throw new Error("Authentication failed");
    }
    const kid =
      typeof header.kid === "string" && header.kid.length > 0
        ? header.kid
        : undefined;
    const jwk = await this.resolveJwk(kid);
    const signingInput = `${headerPart}.${payloadPart}`;
    const signature = base64UrlDecodeToBuffer(signaturePart);
    const publicKey = createPublicKey({
      key: { kty: "RSA", n: jwk.n, e: jwk.e },
      format: "jwk",
    });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(signingInput);
    let valid = false;
    try {
      valid = verifier.verify(publicKey, signature);
    } catch {
      throw new Error("Authentication failed");
    }
    if (!valid) {
      throw new Error("Authentication failed");
    }
    const rawPayload = parseJsonRecord(
      base64UrlDecodeToString(payloadPart),
    );
    validateTimeClaims(rawPayload, this.nowSeconds());
    validateIssuerAudience(rawPayload, this.config);
    const claims = extractJwtClaims(rawPayload);
    return { claims, rawPayload };
  }

  private async resolveJwk(kid: string | undefined): Promise<JwkRsaPublicKey> {
    let document = this.jwksCache;
    if (document === null) {
      document = await this.fetchJwks();
      this.jwksCache = document;
    }
    let jwk = findJwk(document, kid);
    if (jwk === undefined && kid !== undefined) {
      document = await this.fetchJwks();
      this.jwksCache = document;
      jwk = findJwk(document, kid);
    }
    if (jwk === undefined) {
      throw new Error("Authentication failed");
    }
    return jwk;
  }

  private async fetchJwks(): Promise<JwksDocument> {
    const response = await this.transport.send({
      method: "GET",
      url: this.config.jwksUrl,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error("Authentication failed");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.body) as unknown;
    } catch {
      throw new Error("Authentication failed");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Authentication failed");
    }
    const keys = (parsed as { keys?: unknown }).keys;
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("Authentication failed");
    }
    const rsaKeys: JwkRsaPublicKey[] = [];
    for (const entry of keys) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as JwkRsaPublicKey;
      if (
        record.kty === "RSA" &&
        typeof record.n === "string" &&
        typeof record.e === "string"
      ) {
        rsaKeys.push(record);
      }
    }
    if (rsaKeys.length === 0) {
      throw new Error("Authentication failed");
    }
    return { keys: rsaKeys };
  }
}

function findJwk(
  document: JwksDocument,
  kid: string | undefined,
): JwkRsaPublicKey | undefined {
  if (kid !== undefined) {
    return document.keys.find((key) => key.kid === kid);
  }
  if (document.keys.length === 1) {
    return document.keys[0];
  }
  return document.keys.find((key) => key.use === undefined || key.use === "sig");
}
