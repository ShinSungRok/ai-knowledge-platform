import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";

export type KnowledgeDocumentExportFormat = "json" | "csv";

/**
 * Input for exporting knowledge documents.
 * `workspaceId` scopes the export to a single workspace — documents in
 * other workspaces are never included. `format` selects the output
 * encoding; defaults to `"json"`.
 */
export interface ExportKnowledgeDocumentsInput {
  workspaceId: string;
  format?: KnowledgeDocumentExportFormat;
}

/**
 * Output of the export use case: the serialized document collection plus
 * metadata a caller can use to set a filename/content-type without this
 * use case depending on any HTTP concern.
 */
export interface ExportKnowledgeDocumentsResult {
  format: KnowledgeDocumentExportFormat;
  content: string;
  count: number;
}

const CSV_COLUMNS = ["id", "title", "text"] as const;

/**
 * Export use case: serialize all knowledge documents in a workspace to JSON
 * or CSV via the repository port.
 *
 * Uses {@link KnowledgeDocumentRepository.findAll} via the port, then applies
 * application-level formatting. Depends only on the port — never on a
 * concrete adapter.
 */
export class ExportKnowledgeDocumentsUseCase {
  constructor(
    private readonly knowledgeDocumentRepository: KnowledgeDocumentRepository,
  ) {}

  async execute(
    input: ExportKnowledgeDocumentsInput,
  ): Promise<ExportKnowledgeDocumentsResult> {
    if (!input || typeof input !== "object") {
      throw new Error("ExportKnowledgeDocumentsInput must be an object");
    }

    const workspaceId = this.requireNonEmptyString(
      input.workspaceId,
      "workspaceId",
    );
    const format = this.resolveFormat(input.format);
    const documents = await this.knowledgeDocumentRepository.findAll(
      workspaceId,
    );

    const content =
      format === "json" ? this.toJson(documents) : this.toCsv(documents);

    return { format, content, count: documents.length };
  }

  private requireNonEmptyString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(
        `ExportKnowledgeDocumentsInput.${field} must be a non-empty string`,
      );
    }
    return value.trim();
  }

  private resolveFormat(
    format: KnowledgeDocumentExportFormat | undefined,
  ): KnowledgeDocumentExportFormat {
    if (format === undefined) {
      return "json";
    }
    if (format !== "json" && format !== "csv") {
      throw new Error(
        `ExportKnowledgeDocumentsInput.format must be one of "json" or "csv", got: ${String(format)}`,
      );
    }
    return format;
  }

  private toJson(documents: KnowledgeDocument[]): string {
    return JSON.stringify(documents, null, 2);
  }

  private toCsv(documents: KnowledgeDocument[]): string {
    const header = CSV_COLUMNS.join(",");
    const rows = documents.map((document) =>
      CSV_COLUMNS.map((column) => this.escapeCsvValue(document[column])).join(
        ",",
      ),
    );
    return [header, ...rows].join("\n");
  }

  private escapeCsvValue(value: string): string {
    const needsQuoting = /[",\n\r]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return needsQuoting ? `"${escaped}"` : escaped;
  }
}
