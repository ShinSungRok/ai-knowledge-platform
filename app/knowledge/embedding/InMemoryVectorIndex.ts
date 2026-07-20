import { EMBEDDING_VECTOR_DIMENSION } from "./EmbeddingVectorDimension";
import type { EmbeddingVector } from "./EmbeddingVector";
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
 * on both write input and read output. Depends only on the
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
