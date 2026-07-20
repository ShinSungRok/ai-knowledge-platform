import type { AuthPrincipal } from "./AuthPrincipal";
import type { Authenticator } from "./Authenticator";

export type ApiKeyPrincipalEntry = {
  subject: string;
  workspaceId: string;
};

/**
 * {@link Authenticator} backed by a static API key → principal map.
 * Map keys are raw token strings. Empty/unknown tokens throw
 * `"Authentication failed"`.
 */
export class ApiKeyAuthenticator implements Authenticator {
  private readonly keys: ReadonlyMap<string, AuthPrincipal>;

  constructor(keys: Readonly<Record<string, ApiKeyPrincipalEntry>>) {
    if (!keys || typeof keys !== "object") {
      throw new Error("api keys map must be an object");
    }
    const map = new Map<string, AuthPrincipal>();
    for (const [token, entry] of Object.entries(keys)) {
      if (typeof token !== "string" || token.trim().length === 0) {
        throw new Error("API key token must be a non-empty string");
      }
      if (!entry || typeof entry !== "object") {
        throw new Error("API key entry must be an object");
      }
      if (
        typeof entry.subject !== "string" ||
        entry.subject.trim().length === 0
      ) {
        throw new Error("API key subject must be a non-empty string");
      }
      if (
        typeof entry.workspaceId !== "string" ||
        entry.workspaceId.trim().length === 0
      ) {
        throw new Error("API key workspaceId must be a non-empty string");
      }
      map.set(token, {
        subject: entry.subject,
        workspaceId: entry.workspaceId,
      });
    }
    this.keys = map;
  }

  async authenticate(credentials: { token: string }): Promise<AuthPrincipal> {
    const token = credentials?.token;
    if (typeof token !== "string" || token.trim().length === 0) {
      throw new Error("Authentication failed");
    }
    const principal = this.keys.get(token);
    if (!principal) {
      throw new Error("Authentication failed");
    }
    return { subject: principal.subject, workspaceId: principal.workspaceId };
  }
}
