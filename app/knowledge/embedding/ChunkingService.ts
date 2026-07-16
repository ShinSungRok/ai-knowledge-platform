import type { KnowledgeDocument } from "../domain/KnowledgeDocument";
import type { DocumentChunk } from "../domain/DocumentChunk";

/**
 * Port for splitting a {@link KnowledgeDocument} into an ordered set of
 * {@link DocumentChunk}s.
 *
 * `chunk` is a pure, synchronous function of its input: it performs no I/O
 * and has no knowledge of storage, embeddings, or source provenance — it
 * only describes how a document's text is segmented. Concrete
 * implementations (fixed-size, and later natural-boundary chunkers) live
 * under `app/knowledge/embedding` and are wired only at the composition
 * root; `application` and `domain` never import a concrete chunker.
 */
export interface ChunkingService {
  chunk(document: KnowledgeDocument): DocumentChunk[];
}
