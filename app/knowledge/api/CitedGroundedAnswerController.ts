import type { KnowledgeRuntime } from "../composition/KnowledgeRuntime";
import type { CitedGroundedAnswer } from "../citation/CitedGroundedAnswer";
import type { HttpRequest } from "../http/HttpRequest";
import type { HttpResponse } from "../http/HttpResponse";
import type { HttpWorkspaceGuard } from "../security/HttpWorkspaceGuard";

const JSON_HEADERS = { "content-type": "application/json" } as const;

const CITED_ANSWER_PATH =
  /^\/workspaces\/([^/]+)\/cited-answers$/;

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: { ...JSON_HEADERS },
    body,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Internal Server Error";
}

function toPlainCitedAnswer(
  workspaceId: string,
  query: string,
  result: CitedGroundedAnswer,
): unknown {
  return {
    workspaceId,
    query,
    answer: {
      text: result.answer.text,
      insufficientEvidence: result.answer.insufficientEvidence,
      evidence: result.answer.evidence.map((block) => ({
        sourceId: block.sourceId,
        documentId: block.documentId,
        chunkId: block.chunkId,
        text: block.text,
        score: block.score,
      })),
    },
    citations: result.citations.map((citation) => ({
      id: citation.id,
      sourceId: citation.sourceId,
      documentId: citation.documentId,
      chunkId: citation.chunkId,
      score: citation.score,
      excerpt: citation.excerpt,
    })),
  };
}

/**
 * HTTP controller for cited grounded answers. Depends on
 * {@link KnowledgeRuntime} and {@link HttpWorkspaceGuard} — never on
 * concrete composition/repos.
 */
export class CitedGroundedAnswerController {
  constructor(
    private readonly runtime: KnowledgeRuntime,
    private readonly guard: HttpWorkspaceGuard,
  ) {}

  async create(request: HttpRequest): Promise<HttpResponse> {
    const pathMatch = CITED_ANSWER_PATH.exec(request.path);
    if (pathMatch === null) {
      return jsonResponse(404, { error: "Not Found" });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method Not Allowed" });
    }

    const workspaceId = pathMatch[1]!;
    try {
      this.guard.assertRequest(request, workspaceId);
    } catch (error: unknown) {
      return jsonResponse(403, { error: errorMessage(error) });
    }

    const body = request.body;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse(400, { error: "body must be a plain object" });
    }

    const record = body as Record<string, unknown>;
    if (typeof record.query !== "string") {
      return jsonResponse(400, { error: "query must be a string" });
    }

    let retrievalLimit: number | undefined;
    if (record.retrievalLimit !== undefined) {
      if (typeof record.retrievalLimit !== "number") {
        return jsonResponse(400, { error: "retrievalLimit must be a number" });
      }
      retrievalLimit = record.retrievalLimit;
    }

    let maxCharacters: number | undefined;
    if (record.maxCharacters !== undefined) {
      if (typeof record.maxCharacters !== "number") {
        return jsonResponse(400, { error: "maxCharacters must be a number" });
      }
      maxCharacters = record.maxCharacters;
    }

    try {
      const result = await this.runtime.generateCitedGroundedAnswer({
        workspaceId,
        query: record.query,
        retrievalLimit,
        maxCharacters,
      });
      return jsonResponse(
        200,
        toPlainCitedAnswer(workspaceId, record.query, result),
      );
    } catch (error: unknown) {
      return jsonResponse(500, { error: errorMessage(error) });
    }
  }
}
