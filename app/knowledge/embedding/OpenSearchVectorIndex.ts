import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingVector } from "./EmbeddingVector";
import type { OpenSearchClientConfig } from "./OpenSearchClientConfig";
import type { OpenSearchHttpTransport } from "./OpenSearchHttpTransport";
import type { ScoredEmbeddingVector } from "./ScoredEmbeddingVector";
import type { VectorIndex } from "./VectorIndex";

/**
 * Deterministic Painless source for cosine similarity over a stored float
 * vector array. Shared with Fake transports so ranking stays aligned with
 * {@link InMemoryVectorIndex} / {@link SqlVectorIndex} (zero-norm → 0).
 */
export const OPENSEARCH_VECTOR_COSINE_SCRIPT_SOURCE =
  "double dot=0.0;double qn=0.0;double dn=0.0;for(int i=0;i<params.queryVector.length;i++){double q=params.queryVector[i];double d=doc['vector'][i];dot+=q*d;qn+=q*q;dn+=d*d;}if(qn==0.0||dn==0.0){return 0.0;}return dot/(Math.sqrt(qn)*Math.sqrt(dn));";

/**
 * OpenSearch REST adapter for {@link VectorIndex}.
 *
 * Uses {@link OpenSearchHttpTransport} only — no official OpenSearch JS SDK.
 * Index mapping stores `workspaceId`/`chunkId` as keyword and `vector` as a
 * float array; nearest neighbor uses `script_score` cosine (not knn plugin).
 */
export class OpenSearchVectorIndex implements VectorIndex {
  private indexEnsured = false;

  constructor(
    private readonly config: OpenSearchClientConfig,
    private readonly transport: OpenSearchHttpTransport,
  ) {}

  async upsert(vector: EmbeddingVector): Promise<void> {
    const validated = this.assertAndCloneVector(vector);
    await this.ensureIndex();
    const id = this.documentId(validated.workspaceId, validated.chunkId);
    const response = await this.transport.send({
      method: "PUT",
      path: `/${this.config.indexName}/_doc/${encodeURIComponent(id)}?refresh=true`,
      headers: this.requestHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        workspaceId: validated.workspaceId,
        chunkId: validated.chunkId,
        vector: validated.vector,
      }),
    });
    this.assertOk(response.status, "upsert document");
  }

  async findByChunkId(
    workspaceId: string,
    chunkId: string,
  ): Promise<EmbeddingVector | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    const id = this.documentId(workspaceId, chunkId);
    const response = await this.transport.send({
      method: "GET",
      path: `/${this.config.indexName}/_doc/${encodeURIComponent(id)}`,
      headers: this.requestHeaders(),
    });
    if (response.status === 404) {
      return null;
    }
    this.assertOk(response.status, "get document");
    const parsed = this.parseJson(response.body, "get document body");
    const source = (parsed as { _source?: unknown })._source;
    return this.sourceToVector(source);
  }

  async deleteByChunkId(workspaceId: string, chunkId: string): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    const id = this.documentId(workspaceId, chunkId);
    const response = await this.transport.send({
      method: "DELETE",
      path: `/${this.config.indexName}/_doc/${encodeURIComponent(id)}?refresh=true`,
      headers: this.requestHeaders(),
    });
    if (response.status === 404) {
      return;
    }
    this.assertOk(response.status, "delete document");
  }

  async findNearest(
    workspaceId: string,
    queryVector: number[],
    limit: number,
  ): Promise<ScoredEmbeddingVector[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertQueryVector(queryVector);
    this.assertPositiveIntegerLimit(limit);

    const response = await this.transport.send({
      method: "POST",
      path: `/${this.config.indexName}/_search`,
      headers: this.requestHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        size: limit,
        query: {
          script_score: {
            query: {
              bool: {
                filter: [{ term: { workspaceId } }],
              },
            },
            script: {
              source: OPENSEARCH_VECTOR_COSINE_SCRIPT_SOURCE,
              params: { queryVector: [...queryVector] },
            },
          },
        },
        sort: [{ _score: "desc" }, { chunkId: "asc" }],
      }),
    });
    this.assertOk(response.status, "search");
    const parsed = this.parseJson(response.body, "search body");
    const hits = (parsed as { hits?: { hits?: unknown } }).hits?.hits;
    if (!Array.isArray(hits)) {
      throw new Error("OpenSearch search response missing hits.hits");
    }

    const scored: ScoredEmbeddingVector[] = [];
    for (const hit of hits) {
      if (!hit || typeof hit !== "object") {
        throw new Error("OpenSearch hit must be an object");
      }
      const record = hit as { _source?: unknown; _score?: unknown };
      const vector = this.sourceToVector(record._source);
      if (typeof record._score !== "number" || !Number.isFinite(record._score)) {
        throw new Error("OpenSearch hit._score must be a finite number");
      }
      scored.push({ vector, score: record._score });
    }
    return scored;
  }

  private async ensureIndex(): Promise<void> {
    if (this.indexEnsured) {
      return;
    }
    const head = await this.transport.send({
      method: "HEAD",
      path: `/${this.config.indexName}`,
      headers: this.requestHeaders(),
    });
    if (head.status === 200) {
      this.indexEnsured = true;
      return;
    }
    if (head.status !== 404) {
      throw new Error(
        `OpenSearch HEAD index failed with status ${String(head.status)}`,
      );
    }
    const put = await this.transport.send({
      method: "PUT",
      path: `/${this.config.indexName}`,
      headers: this.requestHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        mappings: {
          properties: {
            workspaceId: { type: "keyword" },
            chunkId: { type: "keyword" },
            vector: { type: "float" },
          },
        },
      }),
    });
    this.assertOk(put.status, "create index");
    this.indexEnsured = true;
  }

  private documentId(workspaceId: string, chunkId: string): string {
    return `${workspaceId}:${chunkId}`;
  }

  private requestHeaders(
    extra?: Readonly<Record<string, string>>,
  ): Record<string, string> | undefined {
    const merged: Record<string, string> = {
      ...(this.config.headers ?? {}),
      ...(extra ?? {}),
    };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private assertOk(status: number, action: string): void {
    if (status < 200 || status >= 300) {
      throw new Error(
        `OpenSearch ${action} failed with status ${String(status)}`,
      );
    }
  }

  private parseJson(body: string, label: string): unknown {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error(`OpenSearch ${label} must be valid JSON`);
    }
  }

  private sourceToVector(source: unknown): EmbeddingVector {
    if (!source || typeof source !== "object") {
      throw new Error("OpenSearch _source must be an object");
    }
    const record = source as {
      workspaceId?: unknown;
      chunkId?: unknown;
      vector?: unknown;
    };
    if (typeof record.workspaceId !== "string") {
      throw new Error("OpenSearch _source.workspaceId must be a string");
    }
    if (typeof record.chunkId !== "string") {
      throw new Error("OpenSearch _source.chunkId must be a string");
    }
    if (!Array.isArray(record.vector)) {
      throw new Error("OpenSearch _source.vector must be an array");
    }
    const vector = record.vector.map((value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("OpenSearch _source.vector entries must be finite numbers");
      }
      return value;
    });
    return {
      workspaceId: record.workspaceId,
      chunkId: record.chunkId,
      vector: [...vector],
    };
  }

  private assertQueryVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error("queryVector must be an array");
    }
    if (vector.length !== EMBEDDING_VECTOR_DIMENSION) {
      throw new Error(
        `queryVector must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
      );
    }
    for (const value of vector) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("queryVector entries must all be finite numbers");
      }
    }
  }

  private assertPositiveIntegerLimit(limit: number): void {
    if (typeof limit !== "number" || !Number.isInteger(limit) || limit <= 0) {
      throw new Error("limit must be a positive integer");
    }
  }

  private assertAndCloneVector(vector: EmbeddingVector): EmbeddingVector {
    if (!vector || typeof vector !== "object") {
      throw new Error("EmbeddingVector must be an object");
    }
    this.assertNonEmptyString(vector.workspaceId, "workspaceId");
    this.assertNonEmptyString(vector.chunkId, "chunkId");
    if (!Array.isArray(vector.vector)) {
      throw new Error("EmbeddingVector.vector must be an array");
    }
    if (vector.vector.length !== EMBEDDING_VECTOR_DIMENSION) {
      throw new Error(
        `EmbeddingVector.vector must have exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
      );
    }
    for (const value of vector.vector) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "EmbeddingVector.vector entries must all be finite numbers",
        );
      }
    }
    return {
      workspaceId: vector.workspaceId,
      chunkId: vector.chunkId,
      vector: [...vector.vector],
    };
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`EmbeddingVector.${field} must be a non-empty string`);
    }
  }
}
