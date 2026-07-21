import { createHmac, timingSafeEqual } from "node:crypto";

import type { JwtAuthConfig } from "./JwtAuthConfig";
import { JWT_CLAIM_WORKSPACE_ID } from "./JwtClaims";
import type { JwtClaims } from "./JwtClaims";
import type { JwtVerifier } from "./JwtVerifier";
import type { VerifiedJwt } from "./VerifiedJwt";

export type Hs256JwtVerifierOptions = {
  nowSeconds?: () => number;
};

/**
 * HS256 {@link JwtVerifier} using Node `crypto` only (no JWT SDK).
 */
export class Hs256JwtVerifier implements JwtVerifier {
  private readonly config: Extract<JwtAuthConfig, { type: "hs256" }>;
  private readonly nowSeconds: () => number;

  constructor(
    config: Extract<JwtAuthConfig, { type: "hs256" }>,
    options: Hs256JwtVerifierOptions = {},
  ) {
    if (config.type !== "hs256") {
      throw new Error("Hs256JwtVerifier requires hs256 config");
    }
    if (typeof config.secret !== "string" || config.secret.length === 0) {
      throw new Error("JWT secret must be a non-empty string");
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
    if (header.alg !== "HS256") {
      throw new Error("Authentication failed");
    }
    const signingInput = `${headerPart}.${payloadPart}`;
    const expected = createHmac("sha256", this.config.secret)
      .update(signingInput)
      .digest();
    const actual = base64UrlDecodeToBuffer(signaturePart);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
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
}

export function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecodeToBuffer(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

export function base64UrlDecodeToString(input: string): string {
  return base64UrlDecodeToBuffer(input).toString("utf8");
}

export function signHs256Jwt(
  payload: Record<string, unknown>,
  secret: string,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export function parseJsonRecord(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Authentication failed");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Authentication failed");
  }
  return parsed as Record<string, unknown>;
}

export function validateTimeClaims(
  payload: Record<string, unknown>,
  nowSeconds: number,
): void {
  const exp = payload.exp;
  if (exp !== undefined) {
    if (typeof exp !== "number" || !Number.isFinite(exp)) {
      throw new Error("Authentication failed");
    }
    if (nowSeconds >= exp) {
      throw new Error("Authentication failed");
    }
  }
  const nbf = payload.nbf;
  if (nbf !== undefined) {
    if (typeof nbf !== "number" || !Number.isFinite(nbf)) {
      throw new Error("Authentication failed");
    }
    if (nowSeconds < nbf) {
      throw new Error("Authentication failed");
    }
  }
}

export function validateIssuerAudience(
  payload: Record<string, unknown>,
  config: { issuer?: string; audience?: string },
): void {
  if (config.issuer !== undefined) {
    if (payload.iss !== config.issuer) {
      throw new Error("Authentication failed");
    }
  }
  if (config.audience !== undefined) {
    const aud = payload.aud;
    const matches =
      aud === config.audience ||
      (Array.isArray(aud) && aud.includes(config.audience));
    if (!matches) {
      throw new Error("Authentication failed");
    }
  }
}

export function extractJwtClaims(
  payload: Record<string, unknown>,
): JwtClaims {
  const sub = payload.sub;
  const workspaceRaw = payload[JWT_CLAIM_WORKSPACE_ID];
  if (typeof sub !== "string" || sub.trim().length === 0) {
    throw new Error("Authentication failed");
  }
  if (typeof workspaceRaw !== "string" || workspaceRaw.trim().length === 0) {
    throw new Error("Authentication failed");
  }
  const claims: JwtClaims = {
    sub,
    workspaceId: workspaceRaw,
  };
  if (typeof payload.iss === "string") {
    claims.iss = payload.iss;
  }
  if (
    typeof payload.aud === "string" ||
    (Array.isArray(payload.aud) &&
      payload.aud.every((value) => typeof value === "string"))
  ) {
    claims.aud = payload.aud as string | string[];
  }
  if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
    claims.exp = payload.exp;
  }
  if (typeof payload.nbf === "number" && Number.isFinite(payload.nbf)) {
    claims.nbf = payload.nbf;
  }
  return claims;
}
