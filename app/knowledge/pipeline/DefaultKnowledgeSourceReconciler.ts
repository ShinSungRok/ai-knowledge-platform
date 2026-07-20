import type { DocumentChunkRepository } from "../repository/DocumentChunkRepository";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { VectorIndex } from "../embedding/VectorIndex";
import type {
  KnowledgeSourceReconcileInput,
  KnowledgeSourceReconcileResult,
  KnowledgeSourceReconciler,
} from "./KnowledgeSourceReconciler";

/**
 * Default {@link KnowledgeSourceReconciler}: for each removed document id,
 * deletes chunk vectors, clears the document's chunk set, then deletes the
 * document — in that order — using only repository/vector ports.
 *
 * Missing documents are skipped (not counted). A document whose `sourceId`
 * does not match the reconcile input throws and stops further deletions
 * without rolling back earlier successful removals.
 */
export class DefaultKnowledgeSourceReconciler
  implements KnowledgeSourceReconciler
{
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly documentChunkRepository: DocumentChunkRepository,
    private readonly vectorIndex: VectorIndex,
  ) {}

  async reconcile(
    input: KnowledgeSourceReconcileInput,
  ): Promise<KnowledgeSourceReconcileResult> {
    const { workspaceId, sourceId, removedDocumentIds } = this.toInput(input);

    let removedDocumentCount = 0;
    let removedChunkCount = 0;
    let removedVectorCount = 0;

    for (const documentId of removedDocumentIds) {
      this.assertNonEmptyString(documentId, "removedDocumentIds entry");

      const document = await this.knowledgeDocumentRepository.findById(
        workspaceId,
        documentId,
      );
      if (!document) {
        continue;
      }
      if (document.sourceId !== sourceId) {
        throw new Error(
          `Document source mismatch during reconcile: ${documentId}`,
        );
      }

      const chunks = await this.documentChunkRepository.findByDocumentId(
        workspaceId,
        documentId,
      );
      for (const chunk of chunks) {
        await this.vectorIndex.deleteByChunkId(workspaceId, chunk.id);
        removedVectorCount += 1;
      }
      removedChunkCount += chunks.length;

      await this.documentChunkRepository.replaceForDocument(
        workspaceId,
        documentId,
        [],
      );
      await this.knowledgeDocumentRepository.deleteById(workspaceId, documentId);
      removedDocumentCount += 1;
    }

    return {
      removedDocumentCount,
      removedChunkCount,
      removedVectorCount,
    };
  }

  private toInput(
    input: KnowledgeSourceReconcileInput,
  ): KnowledgeSourceReconcileInput {
    if (!input || typeof input !== "object") {
      throw new Error("KnowledgeSourceReconcileInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "KnowledgeSourceReconcileInput.workspaceId must be a non-empty string",
      );
    }
    if (
      typeof input.sourceId !== "string" ||
      input.sourceId.trim().length === 0
    ) {
      throw new Error(
        "KnowledgeSourceReconcileInput.sourceId must be a non-empty string",
      );
    }
    if (!Array.isArray(input.removedDocumentIds)) {
      throw new Error(
        "KnowledgeSourceReconcileInput.removedDocumentIds must be an array",
      );
    }
    return {
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      removedDocumentIds: input.removedDocumentIds,
    };
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `KnowledgeSourceReconcileInput.${field} must be a non-empty string`,
      );
    }
  }
}
