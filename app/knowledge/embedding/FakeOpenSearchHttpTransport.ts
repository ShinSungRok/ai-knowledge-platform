import type { OpenSearchHttpRequest } from "./OpenSearchHttpRequest";
import type { OpenSearchHttpResponse } from "./OpenSearchHttpResponse";
import type { OpenSearchHttpTransport } from "./OpenSearchHttpTransport";

type StoredDoc = {
  workspaceId: string;
  chunkId: string;
  vector: number[];
};

/**
 * In-memory OpenSearch REST subset for {@link OpenSearchVectorIndex} validation.
 *
 * Supports HEAD/PUT index, PUT/GET/DELETE `_doc`, and POST `_search` with
 * workspace term filter + cosine ranking (score desc, chunkId asc).
 */
export class FakeOpenSearchHttpTransport implements OpenSearchHttpTransport {
  private readonly indexes = new Set<string>();
  private readonly documents = new Map<string, StoredDoc>();

  async send(request: OpenSearchHttpRequest): Promise<OpenSearchHttpResponse> {
    const { method, path } = request;
    const { pathname, searchParams } = this.parsePath(path);

    if (method === "HEAD" && this.isIndexPath(pathname)) {
      const indexName = this.indexFromPath(pathname);
      return this.indexes.has(indexName)
        ? { status: 200, body: "" }
        : { status: 404, body: "" };
    }

    if (method === "PUT" && this.isIndexPath(pathname)) {
      const indexName = this.indexFromPath(pathname);
      this.indexes.add(indexName);
      return { status: 200, body: JSON.stringify({ acknowledged: true }) };
    }

    if (method === "PUT" && this.isDocPath(pathname)) {
      const { indexName, docId } = this.docFromPath(pathname);
      this.indexes.add(indexName);
      const body = this.parseBodyObject(request.body);
      const doc = this.toStoredDoc(body);
      this.documents.set(this.docKey(indexName, docId), doc);
      void searchParams;
      return {
        status: 200,
        body: JSON.stringify({ result: "created", _id: docId }),
      };
    }

    if (method === "GET" && this.isDocPath(pathname)) {
      const { indexName, docId } = this.docFromPath(pathname);
      const stored = this.documents.get(this.docKey(indexName, docId));
      if (!stored) {
        return { status: 404, body: JSON.stringify({ found: false }) };
      }
      return {
        status: 200,
        body: JSON.stringify({
          found: true,
          _id: docId,
          _source: {
            workspaceId: stored.workspaceId,
            chunkId: stored.chunkId,
            vector: [...stored.vector],
          },
        }),
      };
    }

    if (method === "DELETE" && this.isDocPath(pathname)) {
      const { indexName, docId } = this.docFromPath(pathname);
      const key = this.docKey(indexName, docId);
      if (!this.documents.has(key)) {
        return { status: 404, body: JSON.stringify({ result: "not_found" }) };
      }
      this.documents.delete(key);
      return {
        status: 200,
        body: JSON.stringify({ result: "deleted", _id: docId }),
      };
    }

    if (method === "POST" && pathname.endsWith("/_search")) {
      const indexName = pathname.slice(1, -"/_search".length);
      return this.search(indexName, request.body);
    }

    throw new Error(
      `FakeOpenSearchHttpTransport unsupported ${method} ${pathname}`,
    );
  }

  private search(indexName: string, bodyText: string | undefined): OpenSearchHttpResponse {
    const body = this.parseBodyObject(bodyText);
    const size =
      typeof body.size === "number" && Number.isInteger(body.size) && body.size > 0
        ? body.size
        : 10;
    const workspaceId = this.extractWorkspaceFilter(body);
    const queryVector = this.extractQueryVector(body);

    const scored: Array<{ doc: StoredDoc; score: number; id: string }> = [];
    const queryNorm = this.norm(queryVector);
    for (const [key, doc] of this.documents.entries()) {
      if (!key.startsWith(`${indexName}\0`)) {
        continue;
      }
      if (doc.workspaceId !== workspaceId) {
        continue;
      }
      const id = key.slice(indexName.length + 1);
      scored.push({
        doc,
        id,
        score: this.cosineSimilarity(queryVector, queryNorm, doc.vector),
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.doc.chunkId < b.doc.chunkId) return -1;
      if (a.doc.chunkId > b.doc.chunkId) return 1;
      return 0;
    });

    const hits = scored.slice(0, size).map((entry) => ({
      _id: entry.id,
      _score: entry.score,
      _source: {
        workspaceId: entry.doc.workspaceId,
        chunkId: entry.doc.chunkId,
        vector: [...entry.doc.vector],
      },
    }));

    return {
      status: 200,
      body: JSON.stringify({ hits: { hits, total: { value: hits.length } } }),
    };
  }

  private extractWorkspaceFilter(body: Record<string, unknown>): string {
    const query = body.query;
    if (!query || typeof query !== "object") {
      throw new Error("Fake search requires query");
    }
    const scriptScore = (query as { script_score?: unknown }).script_score;
    if (!scriptScore || typeof scriptScore !== "object") {
      throw new Error("Fake search requires script_score");
    }
    const inner = (scriptScore as { query?: unknown }).query;
    if (!inner || typeof inner !== "object") {
      throw new Error("Fake search requires script_score.query");
    }
    const bool = (inner as { bool?: unknown }).bool;
    if (!bool || typeof bool !== "object") {
      throw new Error("Fake search requires bool filter");
    }
    const filter = (bool as { filter?: unknown }).filter;
    if (!Array.isArray(filter) || filter.length === 0) {
      throw new Error("Fake search requires filter array");
    }
    const term = (filter[0] as { term?: { workspaceId?: unknown } }).term;
    const workspaceId = term?.workspaceId;
    if (typeof workspaceId !== "string") {
      throw new Error("Fake search requires term.workspaceId");
    }
    return workspaceId;
  }

  private extractQueryVector(body: Record<string, unknown>): number[] {
    const query = body.query as { script_score?: { script?: { params?: { queryVector?: unknown } } } };
    const raw = query.script_score?.script?.params?.queryVector;
    if (!Array.isArray(raw)) {
      throw new Error("Fake search requires script.params.queryVector");
    }
    return raw.map((value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("queryVector entries must be finite numbers");
      }
      return value;
    });
  }

  private parsePath(path: string): {
    pathname: string;
    searchParams: URLSearchParams;
  } {
    const q = path.indexOf("?");
    if (q === -1) {
      return { pathname: path, searchParams: new URLSearchParams() };
    }
    return {
      pathname: path.slice(0, q),
      searchParams: new URLSearchParams(path.slice(q + 1)),
    };
  }

  private isIndexPath(pathname: string): boolean {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length === 1;
  }

  private isDocPath(pathname: string): boolean {
    const parts = pathname.split("/").filter(Boolean);
    return parts.length === 3 && parts[1] === "_doc";
  }

  private indexFromPath(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);
    const name = parts[0];
    if (!name) {
      throw new Error("missing index name");
    }
    return decodeURIComponent(name);
  }

  private docFromPath(pathname: string): { indexName: string; docId: string } {
    const parts = pathname.split("/").filter(Boolean);
    const indexName = parts[0];
    const docId = parts[2];
    if (!indexName || !docId) {
      throw new Error("invalid doc path");
    }
    return {
      indexName: decodeURIComponent(indexName),
      docId: decodeURIComponent(docId),
    };
  }

  private docKey(indexName: string, docId: string): string {
    return `${indexName}\0${docId}`;
  }

  private parseBodyObject(body: string | undefined): Record<string, unknown> {
    if (body === undefined || body.length === 0) {
      return {};
    }
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("request body must be a JSON object");
    }
    return parsed as Record<string, unknown>;
  }

  private toStoredDoc(body: Record<string, unknown>): StoredDoc {
    const workspaceId = body.workspaceId;
    const chunkId = body.chunkId;
    const vector = body.vector;
    if (typeof workspaceId !== "string" || typeof chunkId !== "string") {
      throw new Error("document requires workspaceId/chunkId strings");
    }
    if (!Array.isArray(vector)) {
      throw new Error("document requires vector array");
    }
    return {
      workspaceId,
      chunkId,
      vector: vector.map((value) => {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error("vector entries must be finite numbers");
        }
        return value;
      }),
    };
  }

  private cosineSimilarity(
    query: number[],
    queryNorm: number,
    candidate: number[],
  ): number {
    const candidateNorm = this.norm(candidate);
    if (queryNorm === 0 || candidateNorm === 0) {
      return 0;
    }
    let dot = 0;
    for (let i = 0; i < query.length; i += 1) {
      dot += (query[i] ?? 0) * (candidate[i] ?? 0);
    }
    return dot / (queryNorm * candidateNorm);
  }

  private norm(vector: number[]): number {
    let sumOfSquares = 0;
    for (const value of vector) {
      sumOfSquares += value * value;
    }
    return Math.sqrt(sumOfSquares);
  }
}
