import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { EmbeddingProvider } from "../embedding/EmbeddingProvider";
import { EMBEDDING_VECTOR_DIMENSION } from "../embedding/EmbeddingVectorDimension";
import type { VectorIndex } from "../embedding/VectorIndex";
import type { EmbeddingVector } from "../embedding/EmbeddingVector";

/**
 * Input for embedding a single stored document's chunks.
 */
export interface EmbedDocumentChunksInput {
  workspaceId: string;
  documentId: string;
}

/**
 * Result of an embed run. Deliberately minimal — no per-vector detail, no
 * provider/index internals.
 */
export interface EmbedDocumentChunksResult {
  documentId: string;
  embeddedChunkCount: number;
}

/**
 * Chunk → Embedding vector pipeline for a single already-stored document's
 * chunks.
 *
 * Orchestrates {@link DocumentChunkRepository}, {@link EmbeddingProvider},
 * and {@link VectorIndex} — pure ports, never concrete adapters. It reads
 * the document's chunks (ordered via `findByDocumentId`), embeds each
 * chunk's text, and only after validating every provider result's
 * dimension and finite values does it begin writing to the vector index —
 * so a single malformed provider result rejects the whole run with no
 * partial vector-index writes. Each vector carries the originating chunk's
 * own `workspaceId`/`id`, and `VectorIndex.upsert` always replaces any
 * existing vector for that `(workspaceId, chunkId)` identity, so
 * re-running against the same document never duplicates vectors.
 *
 * A document with no chunks succeeds with a zero-count result — no
 * provider or vector-index call. Document existence, whole-source
 * processing, similarity search/retrieval/ranking, chunk generation, and
 * any batch-provider/external-embedding-API concern are explicitly out of
 * scope for this pipeline.
 */
export class EmbedDocumentChunksPipeline {
  constructor(
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async embedDocument(
    input: EmbedDocumentChunksInput,
  ): Promise<EmbedDocumentChunksResult> {
    const { workspaceId, documentId } = this.toInput(input);

    const chunks = await this.documentChunkRepository.findByDocumentId(
      workspaceId,
      documentId,
    );
    if (chunks.length === 0) {
      return { documentId, embeddedChunkCount: 0 };
    }

    const vectors = await this.embedAndValidateChunks(chunks);

    for (const vector of vectors) {
      await this.vectorIndex.upsert(vector);
    }

    return { documentId, embeddedChunkCount: vectors.length };
  }

  /**
   * Embeds every chunk and validates the full set of resulting vectors —
   * dimension and finite values — before returning. Performs no
   * `VectorIndex` write; throwing here must never leave a partial index
   * write behind.
   */
  private async embedAndValidateChunks(
    chunks: DocumentChunk[],
  ): Promise<EmbeddingVector[]> {
    const vectors: EmbeddingVector[] = [];
    for (const chunk of chunks) {
      const vector = await this.embeddingProvider.embed(chunk.text);
      vectors.push({
        workspaceId: chunk.workspaceId,
        chunkId: chunk.id,
        vector,
      });
    }

    for (const vector of vectors) {
      this.assertVector(vector.vector);
    }

    return vectors;
  }

  private assertVector(vector: number[]): void {
    if (!Array.isArray(vector)) {
      throw new Error("EmbeddingProvider.embed must return an array");
    }
    if (vector.length !== EMBEDDING_VECTOR_DIMENSION) {
      throw new Error(
        `EmbeddingProvider.embed must return exactly ${EMBEDDING_VECTOR_DIMENSION} entries`,
      );
    }
    for (const value of vector) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(
          "EmbeddingProvider.embed result entries must all be finite numbers",
        );
      }
    }
  }

  private toInput(
    input: EmbedDocumentChunksInput,
  ): EmbedDocumentChunksInput {
    if (!input || typeof input !== "object") {
      throw new Error("EmbedDocumentChunksInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "EmbedDocumentChunksInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.documentId !== "string" ||
      input.documentId.trim().length === 0
    ) {
      throw new Error(
        "EmbedDocumentChunksInput.documentId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, documentId: input.documentId };
  }
}
