import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { ChunkingService } from "../embedding/ChunkingService";

/**
 * Input for chunking a single stored document.
 */
export interface ChunkKnowledgeDocumentInput {
  workspaceId: string;
  documentId: string;
}

/**
 * Result of a chunk run. Deliberately minimal — no per-chunk detail, no
 * chunker/storage internals.
 */
export interface ChunkKnowledgeDocumentResult {
  documentId: string;
  chunkCount: number;
}

/**
 * Document → Chunk pipeline for a single already-stored
 * {@link KnowledgeDocument}.
 *
 * Orchestrates {@link KnowledgeDocumentRepository}, {@link
 * DocumentChunkRepository}, and {@link ChunkingService} — pure Ports, never
 * concrete adapters. It looks up the document, hands it to the chunker, and
 * replaces the document's entire existing chunk set with the chunker's
 * output via `replaceForDocument` (an empty chunker result clears existing
 * chunks). Re-running with the same input is stable: the chunker is
 * deterministic and `replaceForDocument` always fully replaces, never
 * appends.
 *
 * If the document is not found (missing or belonging to a different
 * workspace), this pipeline throws without ever calling the chunker or the
 * chunk repository — no partial side effects. Whole-source processing,
 * automatic chunking during sync, background jobs, and any embedding/vector
 * concern are explicitly out of scope for this pipeline.
 */
export class ChunkKnowledgeDocumentPipeline {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly chunkingService: ChunkingService,
  ) {}

  async chunkDocument(
    input: ChunkKnowledgeDocumentInput,
  ): Promise<ChunkKnowledgeDocumentResult> {
    const { workspaceId, documentId } = this.toInput(input);

    const document = await this.knowledgeDocumentRepository.findById(
      workspaceId,
      documentId,
    );
    if (!document) {
      throw new Error(`KnowledgeDocument not found: ${documentId}`);
    }

    const chunks = this.chunkingService.chunk(document);
    await this.documentChunkRepository.replaceForDocument(
      workspaceId,
      documentId,
      chunks,
    );

    return {
      documentId,
      chunkCount: chunks.length,
    };
  }

  private toInput(
    input: ChunkKnowledgeDocumentInput,
  ): ChunkKnowledgeDocumentInput {
    if (!input || typeof input !== "object") {
      throw new Error("ChunkKnowledgeDocumentInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "ChunkKnowledgeDocumentInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.documentId !== "string" ||
      input.documentId.trim().length === 0
    ) {
      throw new Error(
        "ChunkKnowledgeDocumentInput.documentId must be a non-empty string",
      );
    }
    return { workspaceId: input.workspaceId, documentId: input.documentId };
  }
}
