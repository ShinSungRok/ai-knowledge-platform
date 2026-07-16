import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * Input for listing knowledge documents. `workspaceId` scopes the query to
 * exactly one workspace — documents belonging to other workspaces are never
 * returned.
 */
export interface ListKnowledgeDocumentsInput {
  workspaceId: string;
}

/**
 * Basic query use case: list all knowledge documents in a workspace via the
 * repository port.
 *
 * Depends only on {@link KnowledgeDocumentRepository} — never on a concrete
 * adapter. Composition (or validation) injects the adapter.
 */
export class ListKnowledgeDocumentsUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: ListKnowledgeDocumentsInput,
  ): Promise<KnowledgeDocument[]> {
    if (!input || typeof input !== "object") {
      throw new Error("ListKnowledgeDocumentsInput must be an object");
    }

    const workspaceId = this.requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
    );
    return this.knowledgeDocumentRepository.findAll(workspaceId);
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `ListKnowledgeDocumentsInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }
}
