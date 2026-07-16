import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * Input for updating a knowledge document.
 * `id` identifies the target; `title` / `text` are optional field patches.
 * At least one of `title` or `text` must be provided.
 */
export interface UpdateKnowledgeDocumentInput {
  id: string;
  title?: string;
  text?: string;
}

/**
 * Update use case: patch fields on an existing knowledge document via the
 * repository port.
 *
 * Depends only on {@link KnowledgeDocumentRepository} — never on a concrete
 * adapter. Composition (or validation) injects the adapter.
 */
export class UpdateKnowledgeDocumentUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: UpdateKnowledgeDocumentInput,
  ): Promise<KnowledgeDocument> {
    if (!input || typeof input !== "object") {
      throw new Error("UpdateKnowledgeDocumentInput must be an object");
    }

    const id = this.requireNonEmptyString(input.id, "id");
    const hasTitle = input.title !== undefined;
    const hasText = input.text !== undefined;

    if (!hasTitle && !hasText) {
      throw new Error(
        "UpdateKnowledgeDocumentInput must include at least one of title or text",
      );
    }

    const existing = await this.knowledgeDocumentRepository.findById(id);
    if (!existing) {
      throw new Error(`KnowledgeDocument not found: ${id}`);
    }

    const updated: KnowledgeDocument = {
      id: existing.id,
      title: hasTitle
        ? this.requireNonEmptyString(input.title, "title")
        : existing.title,
      text: hasText ? this.requireString(input.text, "text") : existing.text,
    };

    await this.knowledgeDocumentRepository.save(updated);
    return updated;
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `UpdateKnowledgeDocumentInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string") {
      throw new Error(
        `UpdateKnowledgeDocumentInput.${field} must be a string`,
      );
    }
    return value;
  }
}
