import type { SqlGateway } from "../infra/SqlGateway";
import {
  SQL_DELETE_EMBEDDING_VECTOR,
  SQL_SELECT_EMBEDDING_VECTOR_BY_CHUNK,
  SQL_SELECT_EMBEDDING_VECTORS_BY_WORKSPACE,
  SQL_UPSERT_EMBEDDING_VECTOR,
} from "../infra/embeddingVectorSql";
import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingVector } from "./EmbeddingVector";
import type { ScoredEmbeddingVector } from "./ScoredEmbeddingVector";
import type { VectorIndex } from "./VectorIndex";

/**
 * SQL-backed {@link VectorIndex} over a {@link SqlGateway}.
 *
 * Persists vectors as JSON in `embedding_vectors`. `findNearest` loads all
 * workspace vectors then ranks in-process (cosine, score desc, chunkId asc).
 * Matches {@link InMemoryVectorIndex} validation and ranking contracts.
 */
export class SqlVectorIndex implements VectorIndex {
  constructor(private readonly gateway: SqlGateway) {}

  async upsert(vector: EmbeddingVector): Promise<void> {
    const validated = this.assertAndCloneVector(vector);
    await this.gateway.execute(SQL_UPSERT_EMBEDDING_VECTOR, [
      validated.workspaceId,
      validated.chunkId,
      JSON.stringify(validated.vector),
    ]);
  }

  async findByChunkId(
    workspaceId: string,
    chunkId: string,
  ): Promise<EmbeddingVector | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    const result = await this.gateway.execute(
      SQL_SELECT_EMBEDDING_VECTOR_BY_CHUNK,
      [workspaceId, chunkId],
    );
    if (result.rowCount === 0 || !result.rows[0]) {
      return null;
    }
    return this.rowToVector(result.rows[0]);
  }

  async deleteByChunkId(workspaceId: string, chunkId: string): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    await this.gateway.execute(SQL_DELETE_EMBEDDING_VECTOR, [
      workspaceId,
      chunkId,
    ]);
  }

  async findNearest(
    workspaceId: string,
    queryVector: number[],
    limit: number,
  ): Promise<ScoredEmbeddingVector[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertQueryVector(queryVector);
    this.assertPositiveIntegerLimit(limit);

    const result = await this.gateway.execute(
      SQL_SELECT_EMBEDDING_VECTORS_BY_WORKSPACE,
      [workspaceId],
    );
    const queryNorm = this.norm(queryVector);
    const scored: ScoredEmbeddingVector[] = [];
    for (const row of result.rows) {
      const candidate = this.rowToVector(row);
      scored.push({
        vector: candidate,
        score: this.cosineSimilarity(queryVector, queryNorm, candidate.vector),
      });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.vector.chunkId < b.vector.chunkId) return -1;
      if (a.vector.chunkId > b.vector.chunkId) return 1;
      return 0;
    });

    return scored.slice(0, limit);
  }

  private rowToVector(row: Readonly<Record<string, unknown>>): EmbeddingVector {
    const workspaceId = row.workspace_id;
    const chunkId = row.chunk_id;
    const vectorJson = row.vector_json;
    if (typeof workspaceId !== "string" || typeof chunkId !== "string") {
      throw new Error("embedding_vectors row missing workspace_id/chunk_id");
    }
    if (typeof vectorJson !== "string") {
      throw new Error("embedding_vectors.vector_json must be a string");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(vectorJson);
    } catch {
      throw new Error("embedding_vectors.vector_json must be valid JSON");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("embedding_vectors.vector_json must be a JSON array");
    }
    const vector = parsed.map((value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error("embedding_vectors.vector_json entries must be finite numbers");
      }
      return value;
    });
    return {
      workspaceId,
      chunkId,
      vector: [...vector],
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
    return this.clone(vector);
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`EmbeddingVector.${field} must be a non-empty string`);
    }
  }

  private clone(vector: EmbeddingVector): EmbeddingVector {
    return {
      workspaceId: vector.workspaceId,
      chunkId: vector.chunkId,
      vector: [...vector.vector],
    };
  }
}
