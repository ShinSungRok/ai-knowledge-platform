import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

export type KnowledgeDocumentSearchField = "title" | "text";

/**
 * Input for searching knowledge documents.
 * `workspaceId` scopes the search to a single workspace — documents in
 * other workspaces are never matched. `query` is matched case-insensitively
 * against selected fields. Tags are intentionally out of scope until the
 * domain model includes them.
 */
export interface SearchKnowledgeDocumentsInput {
  workspaceId: string;
  query: string;
  fields?: KnowledgeDocumentSearchField[];
}

const DEFAULT_SEARCH_FIELDS: KnowledgeDocumentSearchField[] = ["title", "text"];

/**
 * Search use case: filter knowledge documents by query against title/text
 * within a workspace.
 *
 * Uses {@link KnowledgeDocumentRepository.findAll} via the port, then applies
 * application-level filtering. Depends only on the port — never on a concrete
 * adapter.
 */
export class SearchKnowledgeDocumentsUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: SearchKnowledgeDocumentsInput,
  ): Promise<KnowledgeDocument[]> {
    if (!input || typeof input !== "object") {
      throw new Error("SearchKnowledgeDocumentsInput must be an object");
    }

    const workspaceId = this.requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
    );
    const query = this.requireNonEmptyString(input.query, "query");
    const fields = this.resolveFields(input.fields);
    const normalizedQuery = query.toLowerCase();

    const documents = await this.knowledgeDocumentRepository.findAll(
      workspaceId,
    );
    return documents.filter((document) =>
      this.matches(document, normalizedQuery, fields),
    );
  }

  private resolveFields(
    fields: KnowledgeDocumentSearchField[] | undefined,
  ): KnowledgeDocumentSearchField[] {
    if (fields === undefined) {
      return [...DEFAULT_SEARCH_FIELDS];
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error(
        "SearchKnowledgeDocumentsInput.fields must be a non-empty array when provided",
      );
    }

    const allowed = new Set<KnowledgeDocumentSearchField>(["title", "text"]);
    for (const field of fields) {
      if (!allowed.has(field)) {
        throw new Error(
          `SearchKnowledgeDocumentsInput.fields contains unsupported field: ${String(field)}`,
        );
      }
    }
    return [...fields];
  }

  private matches(
    document: KnowledgeDocument,
    normalizedQuery: string,
    fields: KnowledgeDocumentSearchField[],
  ): boolean {
    for (const field of fields) {
      const value = document[field].toLowerCase();
      if (value.includes(normalizedQuery)) {
        return true;
      }
    }
    return false;
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `SearchKnowledgeDocumentsInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }
}
