/**
 * Module: `app/knowledge/retrieval`
 *
 * `VectorRetriever` is the port for turning a query into ranked, hydrated
 * `DocumentChunk`s within one workspace (`RetrievalInput` →
 * `RetrievalResult`, each entry a `RetrievedChunk`). `DefaultVectorRetriever`
 * is the adapter, depending only on `EmbeddingProvider`, `VectorIndex`, and
 * `DocumentChunkRepository` ports — never a concrete adapter.
 *
 * Keyword/hybrid retrieval, re-ranking, and context assembly are still
 * deferred.
 */
export const KNOWLEDGE_MODULE_RETRIEVAL = "app/knowledge/retrieval" as const;

export type { RetrievalInput } from "./RetrievalInput";
export type { RetrievalResult, RetrievedChunk } from "./RetrievalResult";
export type { VectorRetriever } from "./VectorRetriever";
export { DefaultVectorRetriever } from "./DefaultVectorRetriever";
