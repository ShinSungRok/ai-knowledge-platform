import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { KnowledgeDocumentRepository } from "../repository/KnowledgeDocumentRepository";
import type { RetrievedChunk } from "../retrieval/RetrievalResult";
import type { ContextAssembler } from "./ContextAssembler";
import type { ContextAssemblyInput } from "./ContextAssemblyInput";
import type { GroundingContext, GroundingContextBlock } from "./GroundingContext";

/** Two newlines join every included block in the rendered `content`, and count against `maxCharacters`. */
const BLOCK_SEPARATOR = "\n\n";

/**
 * Default {@link ContextAssembler} adapter: hydrates each ranked, retrieved
 * chunk's document provenance and renders a bounded, deterministic
 * {@link GroundingContext}.
 *
 * Depends only on the `KnowledgeDocumentRepository` port — never
 * `DocumentChunkRepository`, `VectorIndex`, `EmbeddingProvider`,
 * `HybridSearch`/`VectorRetriever`, or a concrete adapter. Processes
 * `input.chunks` in the order given (the caller's retrieval ranking) and
 * never re-sorts. For each chunk, `chunk.documentId` is resolved to its
 * `KnowledgeDocument` via `KnowledgeDocumentRepository.findById` within
 * `input.workspaceId`, mirroring the vector retriever's stale-result skip
 * pattern: a chunk whose document no longer exists is silently excluded,
 * not counted toward `truncated`. Each included block renders as
 * `[sourceId=<sourceId>;documentId=<documentId>;chunkId=<chunkId>]\n<chunk
 * text>`; a block is included only if the whole rendered block (plus its
 * `"\n\n"` separator, when not first) fits within the remaining
 * `maxCharacters` budget — an oversized block is skipped whole (never
 * truncated mid-text), and evaluation continues so a later, smaller block
 * can still fit. `truncated` is `true` whenever at least one candidate
 * block was excluded for exceeding the remaining budget. An empty
 * `chunks` input, or one where every candidate is stale or oversized,
 * yields empty `blocks` and empty `content`.
 */
export class DefaultContextAssembler implements ContextAssembler {
  constructor(
    private readonly documentRepository: KnowledgeDocumentRepository,
  ) {}

  async assemble(input: ContextAssemblyInput): Promise<GroundingContext> {
    const { workspaceId, query, chunks, maxCharacters } = this.toInput(input);

    const documentCache = new Map<string, KnowledgeDocument | null>();
    const blocks: GroundingContextBlock[] = [];
    const renderedBlocks: string[] = [];
    let usedCharacters = 0;
    let truncated = false;

    for (const retrieved of chunks) {
      const { chunk, score } = retrieved;
      const document = await this.resolveDocument(
        documentCache,
        workspaceId,
        chunk.documentId,
      );
      if (!document) {
        continue;
      }

      const rendered = this.renderBlock(
        document.sourceId,
        chunk.documentId,
        chunk.id,
        chunk.text,
      );
      const additionalLength =
        renderedBlocks.length === 0
          ? rendered.length
          : rendered.length + BLOCK_SEPARATOR.length;

      if (usedCharacters + additionalLength > maxCharacters) {
        truncated = true;
        continue;
      }

      blocks.push({
        sourceId: document.sourceId,
        documentId: chunk.documentId,
        chunkId: chunk.id,
        score,
        text: chunk.text,
      });
      renderedBlocks.push(rendered);
      usedCharacters += additionalLength;
    }

    return {
      query,
      blocks,
      content: renderedBlocks.join(BLOCK_SEPARATOR),
      truncated,
    };
  }

  private async resolveDocument(
    cache: Map<string, KnowledgeDocument | null>,
    workspaceId: string,
    documentId: string,
  ): Promise<KnowledgeDocument | null> {
    const cached = cache.get(documentId);
    if (cached !== undefined) {
      return cached;
    }
    const document = await this.documentRepository.findById(
      workspaceId,
      documentId,
    );
    cache.set(documentId, document);
    return document;
  }

  private renderBlock(
    sourceId: string,
    documentId: string,
    chunkId: string,
    text: string,
  ): string {
    return `[sourceId=${sourceId};documentId=${documentId};chunkId=${chunkId}]\n${text}`;
  }

  private toInput(input: ContextAssemblyInput): ContextAssemblyInput {
    if (!input || typeof input !== "object") {
      throw new Error("ContextAssemblyInput must be an object");
    }
    if (
      typeof input.workspaceId !== "string" ||
      input.workspaceId.trim().length === 0
    ) {
      throw new Error(
        "ContextAssemblyInput.workspaceId must be a non-empty string",
      );
    }
    if (typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("ContextAssemblyInput.query must be a non-empty string");
    }
    if (!Array.isArray(input.chunks)) {
      throw new Error("ContextAssemblyInput.chunks must be an array");
    }
    for (const retrieved of input.chunks) {
      this.assertRetrievedChunk(retrieved);
    }
    if (
      typeof input.maxCharacters !== "number" ||
      !Number.isInteger(input.maxCharacters) ||
      input.maxCharacters <= 0
    ) {
      throw new Error(
        "ContextAssemblyInput.maxCharacters must be a positive integer",
      );
    }
    return {
      workspaceId: input.workspaceId,
      query: input.query,
      chunks: input.chunks,
      maxCharacters: input.maxCharacters,
    };
  }

  private assertRetrievedChunk(retrieved: RetrievedChunk): void {
    if (!retrieved || typeof retrieved !== "object") {
      throw new Error("RetrievedChunk must be an object");
    }
    if (typeof retrieved.score !== "number" || !Number.isFinite(retrieved.score)) {
      throw new Error("RetrievedChunk.score must be a finite number");
    }
    const chunk = retrieved.chunk;
    if (!chunk || typeof chunk !== "object") {
      throw new Error("RetrievedChunk.chunk must be an object");
    }
    this.assertNonEmptyString(chunk.workspaceId, "chunk.workspaceId");
    this.assertNonEmptyString(chunk.id, "chunk.id");
    this.assertNonEmptyString(chunk.documentId, "chunk.documentId");
    if (typeof chunk.text !== "string") {
      throw new Error("RetrievedChunk.chunk.text must be a string");
    }
  }

  private assertNonEmptyString(value: unknown, field: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`RetrievedChunk.${field} must be a non-empty string`);
    }
  }
}
