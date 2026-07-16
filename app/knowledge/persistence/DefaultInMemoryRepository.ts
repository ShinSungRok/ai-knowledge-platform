import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

/**
 * In-memory adapter for {@link KnowledgeDocumentRepository}.
 *
 * Suitable for validation and early composition wiring. Replaceable by a
 * database adapter behind the same port with no domain/application changes.
 */
export class DefaultInMemoryRepository implements KnowledgeDocumentRepository {
  private readonly documentsById = new Map<string, KnowledgeDocument>();

  async save(document: KnowledgeDocument): Promise<void> {
    this.assertDocument(document);
    this.documentsById.set(document.id, {
      id: document.id,
      title: document.title,
      text: document.text,
    });
  }

  async findById(id: string): Promise<KnowledgeDocument | null> {
    this.assertId(id);
    const stored = this.documentsById.get(id);
    return stored ? this.clone(stored) : null;
  }

  async findAll(): Promise<KnowledgeDocument[]> {
    return Array.from(this.documentsById.values()).map((document) =>
      this.clone(document),
    );
  }

  async deleteById(id: string): Promise<void> {
    this.assertId(id);
    this.documentsById.delete(id);
  }

  private assertDocument(document: KnowledgeDocument): void {
    if (!document || typeof document !== "object") {
      throw new Error("KnowledgeDocument must be an object");
    }
    this.assertId(document.id);
    if (typeof document.title !== "string" || document.title.trim().length === 0) {
      throw new Error("KnowledgeDocument.title must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("KnowledgeDocument.text must be a string");
    }
  }

  private assertId(id: string): void {
    if (typeof id !== "string" || id.trim().length === 0) {
      throw new Error("KnowledgeDocument.id must be a non-empty string");
    }
  }

  private clone(document: KnowledgeDocument): KnowledgeDocument {
    return {
      id: document.id,
      title: document.title,
      text: document.text,
    };
  }
}
