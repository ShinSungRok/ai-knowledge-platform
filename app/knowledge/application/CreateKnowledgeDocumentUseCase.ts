import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { KnowledgeSourceRepository } from "../repository/KnowledgeSourceRepository";

/**
 * Input for creating a knowledge document.
 * Kept separate from the persisted domain type so the use case owns the
 * create contract (validation + normalization) at the application boundary.
 * `workspaceId` scopes the duplicate-id check, the source-provenance check,
 * and the write to a single workspace — the same `id` may exist
 * independently in another workspace. `sourceId` must reference a
 * `KnowledgeSource` already registered in the same workspace.
 */
export interface CreateKnowledgeDocumentInput {
  workspaceId: string;
  id: string;
  sourceId: string;
  title: string;
  text: string;
}

/**
 * Create use case: register a knowledge document through the repository
 * port, after confirming its `sourceId` references a `KnowledgeSource`
 * already registered in the same workspace.
 *
 * Depends only on {@link KnowledgeDocumentRepository} and
 * {@link KnowledgeSourceRepository} — never on a concrete adapter.
 * Composition (or validation) injects both adapters.
 */
export class CreateKnowledgeDocumentUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
    private readonly knowledgeSourceRepository: KnowledgeSourceRepository,
  ) {}

  async execute(
    input: CreateKnowledgeDocumentInput,
  ): Promise<KnowledgeDocument> {
    const document = this.toDocument(input);

    const source = await this.knowledgeSourceRepository.findById(
      document.workspaceId,
      document.sourceId,
    );
    if (!source) {
      throw new Error(`KnowledgeSource not found: ${document.sourceId}`);
    }

    const existing = await this.knowledgeDocumentRepository.findById(
      document.workspaceId,
      document.id,
    );
    if (existing) {
      throw new Error(`KnowledgeDocument already exists: ${document.id}`);
    }

    await this.knowledgeDocumentRepository.save(document);
    return document;
  }

  private toDocument(input: CreateKnowledgeDocumentInput): KnowledgeDocument {
    if (!input || typeof input !== "object") {
      throw new Error("CreateKnowledgeDocumentInput must be an object");
    }

    const workspaceId = this.requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
    );
    const id = this.requireNonEmptyString(input.id, "id");
    const sourceId = this.requireNonEmptyString(input.sourceId, "sourceId");
    const title = this.requireNonEmptyString(input.title, "title");
    if (typeof input.text !== "string") {
      throw new Error("CreateKnowledgeDocumentInput.text must be a string");
    }

    return {
      workspaceId,
      id,
      sourceId,
      title,
      text: input.text,
    };
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `CreateKnowledgeDocumentInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }
}
