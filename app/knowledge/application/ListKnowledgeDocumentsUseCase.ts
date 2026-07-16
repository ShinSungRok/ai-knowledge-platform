import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * Basic query use case: list all knowledge documents via the repository port.
 *
 * Depends only on {@link KnowledgeDocumentRepository} — never on a concrete
 * adapter. Composition (or validation) injects the adapter.
 */
export class ListKnowledgeDocumentsUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(): Promise<KnowledgeDocument[]> {
    return this.knowledgeDocumentRepository.findAll();
  }
}
