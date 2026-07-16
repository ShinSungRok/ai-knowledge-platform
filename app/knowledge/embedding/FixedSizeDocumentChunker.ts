import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { DocumentChunk } from "../domain/DocumentChunk";
import type { ChunkingService } from "./ChunkingService";

/**
 * Deterministic, dependency-free {@link ChunkingService} that splits a
 * document's text into fixed-size segments of at most `maxChunkLength`
 * Unicode code points each (via `Array.from(document.text)`, so astral
 * characters/surrogate pairs are never split mid-code-point).
 *
 * Chunk ids are fixed as `${encodeURIComponent(document.id)}:chunk:${order}`
 * — deterministic and collision-free per document, with `order` a
 * 0-based, contiguous sequence. Chunks carry the document's own
 * `workspaceId` and `documentId` (`document.id`); an empty `text` yields an
 * empty array. No natural-language boundary splitting, external chunking
 * library, or storage/embedding concern belongs here.
 */
export class FixedSizeDocumentChunker implements ChunkingService {
  private readonly maxChunkLength: number;

  constructor(maxChunkLength: number) {
    if (
      typeof maxChunkLength !== "number" ||
      !Number.isInteger(maxChunkLength) ||
      maxChunkLength <= 0
    ) {
      throw new Error(
        "FixedSizeDocumentChunker maxChunkLength must be a positive integer",
      );
    }
    this.maxChunkLength = maxChunkLength;
  }

  chunk(document: KnowledgeDocument): DocumentChunk[] {
    this.assertDocument(document);

    const codePoints = Array.from(document.text);
    if (codePoints.length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let order = 0;
    for (
      let start = 0;
      start < codePoints.length;
      start += this.maxChunkLength
    ) {
      const slice = codePoints.slice(start, start + this.maxChunkLength);
      chunks.push({
        workspaceId: document.workspaceId,
        id: `${encodeURIComponent(document.id)}:chunk:${order}`,
        documentId: document.id,
        text: slice.join(""),
        order,
      });
      order += 1;
    }
    return chunks;
  }

  private assertDocument(document: KnowledgeDocument): void {
    if (!document || typeof document !== "object") {
      throw new Error("KnowledgeDocument must be an object");
    }
    if (
      typeof document.workspaceId !== "string" ||
      document.workspaceId.trim().length === 0
    ) {
      throw new Error("KnowledgeDocument.workspaceId must be a non-empty string");
    }
    if (typeof document.id !== "string" || document.id.trim().length === 0) {
      throw new Error("KnowledgeDocument.id must be a non-empty string");
    }
    if (typeof document.text !== "string") {
      throw new Error("KnowledgeDocument.text must be a string");
    }
  }
}
