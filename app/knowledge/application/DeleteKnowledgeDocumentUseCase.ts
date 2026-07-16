import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * Input for deleting a knowledge document by id.
 */
export interface DeleteKnowledgeDocumentInput {
  id: string;
}

/**
 * Delete use case: remove a knowledge document through the repository port.
 *
 * Depends only on {@link KnowledgeDocumentRepository} — never on a concrete
 * adapter. Composition (or validation) injects the adapter.
 */
export class DeleteKnowledgeDocumentUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: DeleteKnowledgeDocumentInput,
  ): Promise<KnowledgeDocument> {
    if (!input || typeof input !== "object") {
      throw new Error("DeleteKnowledgeDocumentInput must be an object");
    }

    const id = this.requireNonEmptyString(input.id, "id");
    const existing = await this.knowledgeDocumentRepository.findById(id);
    if (!existing) {
      throw new Error(`KnowledgeDocument not found: ${id}`);
    }

    await this.knowledgeDocumentRepository.deleteById(id);
    return existing;
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `DeleteKnowledgeDocumentInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }
}
