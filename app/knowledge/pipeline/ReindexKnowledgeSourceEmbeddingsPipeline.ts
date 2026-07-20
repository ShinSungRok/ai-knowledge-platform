import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import { EmbedDocumentChunksPipeline } from "./EmbedDocumentChunksPipeline";

/**
 * Input for re-indexing embeddings for every document of a single source.
 */
export interface ReindexKnowledgeSourceEmbeddingsInput {
  workspaceId: string;
  sourceId: string;
}

/**
 * Result of a reindex run. Deliberately minimal — no per-document detail,
 * no provider/vector-index internals.
 */
export interface ReindexKnowledgeSourceEmbeddingsResult {
  sourceId: string;
  processedDocumentCount: number;
  embeddedChunkCount: number;
}

/**
 * Source-scoped embedding reindex pipeline.
 *
 * Orchestrates {@link KnowledgeSourceRepository}, {@link
 * KnowledgeDocumentRepository}, and {@link EmbedDocumentChunksPipeline} —
 * pure ports/pipelines, never concrete adapters — to re-embed only the
 * documents belonging to one {@link KnowledgeSource}.
 *
 * The source is looked up first; if it is not found (missing or belonging
 * to a different workspace), this pipeline throws without ever listing
 * documents or touching the vector index — no partial side effects.
 * Otherwise it lists every document in the workspace via `findAll` and
 * processes only those whose `sourceId` matches the input, delegating each
 * one to {@link EmbedDocumentChunksPipeline}; documents/vectors belonging
 * to other sources are never read from or written to. A source with no
 * matching documents succeeds with a zero-count result. Since the
 * delegated pipeline's vector-index writes are themselves upsert-by-
 * `(workspaceId, chunkId)` replacements, re-running for the same source
 * replaces rather than duplicates vectors.
 *
 * Automatic reindexing during `SyncKnowledgeSourcePipeline` or
 * `RechunkKnowledgeSourcePipeline`, similarity search/retriever/hybrid
 * search, background scheduling/retry, and deletion of
 * sources/documents/chunks are explicitly out of scope for this pipeline.
 */
export class ReindexKnowledgeSourceEmbeddingsPipeline {
  constructor(
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly embedDocumentChunksPipeline: EmbedDocumentChunksPipeline,
  ) {}

  async reindex(
    input: ReindexKnowledgeSourceEmbeddingsInput,
  ): Promise<ReindexKnowledgeSourceEmbeddingsResult> {
    const { workspaceId, sourceId } = this.toInput(input);

    const source = await this.knowledgeSourceRepository.findById(
      workspaceId,
      sourceId,
    );
    if (!source) {
      throw new Error(`KnowledgeSource not found: ${sourceId}`);
    }

    const allDocuments = await this.knowledgeDocumentRepository.findAll(
      workspaceId,
    );
    const targetDocuments = allDocuments.filter(
      (document) => document.sourceId === sourceId,
    );

    let processedDocumentCount = 0;
    let embeddedChunkCount = 0;
    for (const document of targetDocuments) {
      const result = await this.embedDocumentChunksPipeline.embedDocument({
        workspaceId,
        documentId: document.id,
      });
      processedDocumentCount += 1;
      embeddedChunkCount += result.embeddedChunkCount;
    }

    return { sourceId, processedDocumentCount, embeddedChunkCount };
  }

  private toInput(
    input: ReindexKnowledgeSourceEmbeddingsInput,
  ): ReindexKnowledgeSourceEmbeddingsInput {
    if (!input || typeof input !== "object") {
      throw new Error("ReindexKnowledgeSourceEmbeddingsInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "ReindexKnowledgeSourceEmbeddingsInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "ReindexKnowledgeSourceEmbeddingsInput.sourceId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, sourceId: input.sourceId };
  }
}
