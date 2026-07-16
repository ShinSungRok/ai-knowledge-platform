import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

export type KnowledgeDocumentSortField = "id" | "title";
export type SortOrder = "asc" | "desc";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT_BY: KnowledgeDocumentSortField = "id";
const DEFAULT_SORT_ORDER: SortOrder = "asc";
const MAX_PAGE_SIZE = 100;

/**
 * Input for listing knowledge documents with sorting and paging.
 *
 * Sorting is limited to fields present on {@link KnowledgeDocument} today
 * (`id`, `title`). A creation-date field is not on the domain model yet, so
 * sorting by creation date is intentionally out of scope until a later task
 * adds it to the domain type.
 */
export interface ListKnowledgeDocumentsPageInput {
  page?: number;
  pageSize?: number;
  sortBy?: KnowledgeDocumentSortField;
  sortOrder?: SortOrder;
}

export interface KnowledgeDocumentsPage {
  items: KnowledgeDocument[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/**
 * Sort + page use case: returns a sorted, paginated slice of knowledge
 * documents via the repository port.
 *
 * Uses {@link KnowledgeDocumentRepository.findAll} via the port, then applies
 * application-level sorting and paging. Depends only on the port — never on
 * a concrete adapter.
 */
export class ListKnowledgeDocumentsPageUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: ListKnowledgeDocumentsPageInput = {},
  ): Promise<KnowledgeDocumentsPage> {
    if (!input || typeof input !== "object") {
      throw new Error("ListKnowledgeDocumentsPageInput must be an object");
    }

    const page = this.resolvePage(input.page);
    const pageSize = this.resolvePageSize(input.pageSize);
    const sortBy = this.resolveSortBy(input.sortBy);
    const sortOrder = this.resolveSortOrder(input.sortOrder);

    const documents = await this.knowledgeDocumentRepository.findAll();
    const sorted = this.sort(documents, sortBy, sortOrder);

    const totalCount = sorted.length;
    const totalPages =
      totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, page, pageSize, totalCount, totalPages };
  }

  private sort(
    documents: KnowledgeDocument[],
    sortBy: KnowledgeDocumentSortField,
    sortOrder: SortOrder,
  ): KnowledgeDocument[] {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...documents].sort(
      (a, b) => direction * a[sortBy].localeCompare(b[sortBy]),
    );
  }

  private resolvePage(page: unknown): number {
    if (page === undefined) {
      return DEFAULT_PAGE;
    }
    if (!Number.isInteger(page) || (page as number) < 1) {
      throw new Error(
        "ListKnowledgeDocumentsPageInput.page must be a positive integer",
      );
    }
    return page as number;
  }

  private resolvePageSize(pageSize: unknown): number {
    if (pageSize === undefined) {
      return DEFAULT_PAGE_SIZE;
    }
    if (
      !Number.isInteger(pageSize) ||
      (pageSize as number) < 1 ||
      (pageSize as number) > MAX_PAGE_SIZE
    ) {
      throw new Error(
        `ListKnowledgeDocumentsPageInput.pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      );
    }
    return pageSize as number;
  }

  private resolveSortBy(
    sortBy: KnowledgeDocumentSortField | undefined,
  ): KnowledgeDocumentSortField {
    if (sortBy === undefined) {
      return DEFAULT_SORT_BY;
    }
    if (sortBy !== "id" && sortBy !== "title") {
      throw new Error(
        `ListKnowledgeDocumentsPageInput.sortBy must be one of "id" or "title", got: ${String(sortBy)}`,
      );
    }
    return sortBy;
  }

  private resolveSortOrder(sortOrder: SortOrder | undefined): SortOrder {
    if (sortOrder === undefined) {
      return DEFAULT_SORT_ORDER;
    }
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      throw new Error(
        `ListKnowledgeDocumentsPageInput.sortOrder must be one of "asc" or "desc", got: ${String(sortOrder)}`,
      );
    }
    return sortOrder;
  }
}
