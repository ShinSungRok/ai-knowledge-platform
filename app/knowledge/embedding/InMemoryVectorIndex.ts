import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingVector } from "./EmbeddingVector";
import type { ScoredEmbeddingVector } from "./ScoredEmbeddingVector";
import type { VectorIndex } from "./VectorIndex";

/**
 * In-memory adapter for {@link VectorIndex}.
 *
 * Storage is partitioned by `workspaceId` first, then keyed by `chunkId`
 * within that partition — so the same `chunkId` can exist independently in
 * different workspaces, and every read/write is scoped to exactly one
 * `(workspaceId, chunkId)` pair. `upsert` replaces any existing vector for
 * the same identity; there is no separate insert/update distinction.
 *
 * `upsert` validates the vector before storing it — non-empty
 * `workspaceId`/`chunkId`, a `vector` of exactly `EMBEDDING_VECTOR_DIMENSION`
 * entries, and every entry a finite number — and provides defensive copies
 * on both write input and read output. `findNearest` ranks every vector in
 * the same `workspaceId` by cosine similarity to `queryVector` — descending
 * by score, then ascending by `chunkId` to break ties deterministically —
 * and returns at most `limit` results, each a defensive copy. A zero-norm
 * query or candidate vector scores `0` against everything (cosine
 * similarity is undefined at zero norm; this adapter treats it as "no
 * similarity" rather than throwing). `deleteByChunkId` removes a vector for
 * `(workspaceId, chunkId)` and is a no-op when missing. Depends only on the
 * `EmbeddingVector` domain-adjacent type and its own port — never imports
 * `DocumentChunkRepository`, `KnowledgeDocumentRepository`, or
 * `KnowledgeSourceRepository`.
 *
 * Suitable for validation and early composition wiring. Replaceable by a
 * real vector database adapter behind the same port with no
 * domain/application/pipeline changes.
 */
export class InMemoryVectorIndex implements VectorIndex {
  private readonly vectorsByWorkspace = new Map<
    string,
    Map<string, EmbeddingVector>
  >();

  async upsert(vector: EmbeddingVector): Promise<void> {
    const validated = this.assertAndCloneVector(vector);
    const workspace = this.getOrCreateWorkspace(validated.workspaceId);
    workspace.set(validated.chunkId, validated);
  }

  async findByChunkId(
    workspaceId: string,
    chunkId: string,
  ): Promise<EmbeddingVector | null> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    const stored = this.vectorsByWorkspace.get(workspaceId)?.get(chunkId);
    return stored ? this.clone(stored) : null;
  }

  async deleteByChunkId(workspaceId: string, chunkId: string): Promise<void> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertNonEmptyString(chunkId, "chunkId");
    this.vectorsByWorkspace.get(workspaceId)?.delete(chunkId);
  }

  async findNearest(
    workspaceId: string,
    queryVector: number[],
    limit: number,
  ): Promise<ScoredEmbeddingVector[]> {
    this.assertNonEmptyString(workspaceId, "workspaceId");
    this.assertQueryVector(queryVector);
    this.assertPositiveIntegerLimit(limit);

    const workspace = this.vectorsByWorkspace.get(workspaceId);
    if (!workspace) {
      return [];
    }

    const queryNorm = this.norm(queryVector);
    const scored: ScoredEmbeddingVector[] = [];
    for (const candidate of workspace.values()) {
      scored.push({
        vector: this.clone(candidate),
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

  private getOrCreateWorkspace(
    workspaceId: string,
  ): Map<string, EmbeddingVector> {
    let workspace = this.vectorsByWorkspace.get(workspaceId);
    if (!workspace) {
      workspace = new Map<string, EmbeddingVector>();
      this.vectorsByWorkspace.set(workspaceId, workspace);
    }
    return workspace;
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
        throw new Error("EmbeddingVector.vector entries must all be finite numbers");
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
