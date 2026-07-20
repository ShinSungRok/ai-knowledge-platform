import type { HttpRequest } from "../http/HttpRequest";
import type { AuthPrincipal } from "./AuthPrincipal";
import type { Authenticator } from "./Authenticator";

/**
 * Extracts `Authorization: Bearer <token>` from an {@link HttpRequest}
 * and delegates to an {@link Authenticator}.
 */
export class HttpBearerGuard {
  constructor(private readonly authenticator: Authenticator) {}

  async authenticateRequest(request: HttpRequest): Promise<AuthPrincipal> {
    const header = readHeader(request.headers, "authorization");
    if (header === undefined) {
      throw new Error("Missing or invalid Authorization bearer token");
    }
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    if (!match || !match[1]) {
      throw new Error("Missing or invalid Authorization bearer token");
    }
    return this.authenticator.authenticate({ token: match[1] });
  }
}

function readHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}
