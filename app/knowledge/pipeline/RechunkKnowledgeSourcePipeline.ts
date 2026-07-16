import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import { ChunkKnowledgeDocumentPipeline } from "./ChunkKnowledgeDocumentPipeline";

/**
 * Input for rebuilding chunks for every document of a single source.
 */
export interface RechunkKnowledgeSourceInput {
  workspaceId: string;
  sourceId: string;
}

/**
 * Result of a rechunk run. Deliberately minimal — no per-document detail,
 * no chunker/storage internals.
 */
export interface RechunkKnowledgeSourceResult {
  sourceId: string;
  processedDocumentCount: number;
  savedChunkCount: number;
}

/**
 * Source-scoped chunk rebuild pipeline.
 *
 * Orchestrates {@link KnowledgeSourceRepository}, {@link
 * KnowledgeDocumentRepository}, and {@link ChunkKnowledgeDocumentPipeline}
 * — pure ports/pipelines, never concrete adapters — to re-chunk only the
 * documents belonging to one {@link KnowledgeSource}.
 *
 * The source is looked up first; if it is not found (missing or belonging
 * to a different workspace), this pipeline throws without ever listing
 * documents or touching chunk storage — no partial side effects. Otherwise
 * it lists every document in the workspace via `findAll` and processes only
 * those whose `sourceId` matches the input, delegating each one to {@link
 * ChunkKnowledgeDocumentPipeline}; documents belonging to other sources are
 * never read from or written to. A source with no matching documents
 * succeeds with a zero-count result.
 *
 * Automatic re-chunking during `SyncKnowledgeSourcePipeline`, deletion of
 * documents/chunks that disappeared from the source, background
 * scheduling/retry, and any embedding/vector-index concern are explicitly
 * out of scope for this pipeline.
 */
export class RechunkKnowledgeSourcePipeline {
  constructor(
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly chunkKnowledgeDocumentPipeline: ChunkKnowledgeDocumentPipeline,
  ) {}

  async rechunk(
    input: RechunkKnowledgeSourceInput,
  ): Promise<RechunkKnowledgeSourceResult> {
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
    let savedChunkCount = 0;
    for (const document of targetDocuments) {
      const result = await this.chunkKnowledgeDocumentPipeline.chunkDocument({
        workspaceId,
        documentId: document.id,
      });
      processedDocumentCount += 1;
      savedChunkCount += result.chunkCount;
    }

    return { sourceId, processedDocumentCount, savedChunkCount };
  }

  private toInput(
    input: RechunkKnowledgeSourceInput,
  ): RechunkKnowledgeSourceInput {
    if (!input || typeof input !== "object") {
      throw new Error("RechunkKnowledgeSourceInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "RechunkKnowledgeSourceInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "RechunkKnowledgeSourceInput.sourceId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, sourceId: input.sourceId };
  }
}
