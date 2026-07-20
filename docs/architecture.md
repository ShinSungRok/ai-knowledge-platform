# Architecture

## 1. Purpose

This document describes the architectural style this codebase follows, how
`app/knowledge/*` modules relate to one another, and which direction
dependencies are allowed to point. It is the map to read alongside
[`docs/modules.md`](modules.md).

Task 1 ships **module boundaries only** — no feature implementation. The
philosophy below is inherited from Project1 (`public-law-ai`) and is the
contract Project 2 (and later phases) must honor. Project 2 Platform Baseline
closeout is documented in §8.

## 2. Clean Architecture

Every module is split into **interfaces** (the "port") and **implementations**
(the "adapter"). Business logic (use cases, prompt building, citation
extraction, RAG answer assembly) depends only on the interface, never on a
concrete adapter. This makes it possible to run the entire application against
fakes/in-memory adapters in validation, and against real infrastructure in
production, with **zero changes to the business logic itself**.

Concrete adapters are selected and wired together in exactly one place: the
**composition root** (`app/knowledge/composition`). No use case, controller, or
domain type ever imports a concrete adapter directly.

## 3. Hexagonal Architecture

The same interface/implementation split is organized around the application
core as ports and adapters:

- **Inbound ports/adapters** — `http` adapts an inbound HTTP request into a
  call against `api` controllers, which in turn call application services.
- **Outbound ports/adapters** — retrieval, search, repository, and AI provider
  ports; their concrete adapters are plugged in by the composition root.

Nothing in `application`, `rag`, `context`, or `prompt` knows whether it is
being driven by a real HTTP request, a validation runner, or the production
server entrypoint — that is the point of the hexagon.

## 4. Domain-Driven Design (DDD)

`app/knowledge/domain` holds the framework-independent, canonical model of the
problem. It has no dependency on frameworks, databases, search engines, or AI
SDKs. Application-level orchestration lives in `app/knowledge/application` as
explicit **use cases** — each open about the single job it does, composed from
domain types and ports.

## 5. Module relationships (target)

```
domain  ←──────────────┐  (no outward dependencies)
  ↑                     │
repository              │
  ↑                     │
persistence             │
  ↑                     │
retrieval ←── search ←── embedding
  ↑
context ←── prompt
  ↑
rag ←── citation
  ↑
application ←── ai
  ↑
api ←── http
  ↑
composition  (wires every interface above to a concrete implementation)
  ↑
server  (production entrypoint; boots composition + lifecycle)

config             → read by composition only
evaluation         → depends downward; no production code depends on it
observability      → framework-independent cross-cutting foundation
reliability, security → framework-independent cross-cutting foundations
pipeline, infra    → operational edges; not imported by domain/application
```

Arrows point from a lower-level module toward the higher-level module that
depends on it. `domain` sits at the bottom with no outward dependencies.

## 6. Dependency direction

- **Domain has zero outward dependencies.**
- **Interfaces before implementations.**
- **Composition is the only place allowed to know about every concrete adapter.**
- **Cross-cutting modules stay decoupled from business logic.**
- **No upward imports.** The dependency graph stays acyclic.

## 7. Current limitations

- Domain storage port + in-memory adapter exist (`KnowledgeDocumentRepository` /
  `DefaultInMemoryRepository`).
- `KnowledgeDocument` carries a required `workspaceId` — the minimal logical
  tenancy boundary. Storage, list/page/create/update/delete/search/export all
  read and write scoped to a single `workspaceId`; the same `id` may exist
  independently in different workspaces, and no operation can see or mutate
  another workspace's documents. There is no Workspace entity, CRUD, or
  repository yet — `workspaceId` is only a scoping value on the existing
  document contract.
- CRUD + search use cases exist (`ListKnowledgeDocumentsUseCase`,
  `CreateKnowledgeDocumentUseCase`, `UpdateKnowledgeDocumentUseCase`,
  `DeleteKnowledgeDocumentUseCase`, `SearchKnowledgeDocumentsUseCase`), all
  workspace-scoped. Search covers `title`/`text` only (no tags on the domain
  model yet). `KnowledgeDocument` carries a required `sourceId`:
  `CreateKnowledgeDocumentUseCase` depends on both
  `KnowledgeDocumentRepository` and `KnowledgeSourceRepository` and rejects
  creation (without saving) unless the referenced `KnowledgeSource` is
  registered in the same `workspaceId`. `UpdateKnowledgeDocumentUseCase`
  preserves the original `sourceId` — there is no use case to reassign a
  document's source yet.
- `ListKnowledgeDocumentsPageUseCase` adds sorting + paging, scoped to a
  workspace. Sorting is limited to `id`/`title` — `KnowledgeDocument` has no
  creation-date field yet, so sort-by-creation-date is deferred until the
  domain model adds one.
- `ExportKnowledgeDocumentsUseCase` serializes all documents in a workspace
  to `json` or `csv` via the repository port. It returns the serialized
  string plus a count; it has no knowledge of HTTP, file systems, or
  storage — a caller (composition/API layer, when it exists) decides what to
  do with the output. Both formats preserve document provenance: JSON
  includes `sourceId` as a field, and the CSV column order is fixed to
  `id,sourceId,title,text`.
- `KnowledgeSource` is a minimal workspace-scoped registry entry
  (`workspaceId`, `id`, `name`) with `KnowledgeSourceRepository` /
  `DefaultInMemoryKnowledgeSourceRepository` and
  `CreateKnowledgeSourceUseCase`, following the same
  domain → port → in-memory adapter → use case pattern and workspace
  isolation as `KnowledgeDocument`. `KnowledgeDocument.sourceId` is a
  required provenance reference into this registry, checked at document
  creation time — but there is still no update/delete/list use case for
  sources, and no connector/sync detail on the model yet.
- `KnowledgeSourceConnector` (`app/knowledge/pipeline`) is an outbound port
  for fetching normalized origin documents (`externalId`, `title`, `text`)
  for a given `KnowledgeSource`. `FakeKnowledgeSourceConnector` is a
  dependency-free, fixture-backed adapter scoped by `(workspaceId, sourceId)`
  for validation only. Connectors only fetch/normalize — they never persist,
  sync, or verify `KnowledgeDocument` provenance, and there is no real
  HTTP/file/DB-backed connector yet.
- `SyncKnowledgeSourcePipeline` (`app/knowledge/pipeline`) orchestrates
  `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`, and
  `KnowledgeSourceConnector` into an idempotent sync: it looks up the
  `KnowledgeSource`, fetches its documents, assigns each a deterministic
  canonical id (`${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}`,
  with no trimming/transformation of either value), validates and
  conflict-checks the entire batch before any write, and only then saves —
  so re-syncing the same source updates existing documents in place instead
  of duplicating them, and a single invalid or conflicting document rejects
  the whole batch with no partial writes. It does not delete documents that
  disappear from the source, and has no background scheduling, retry, or
  real network access.
- Task 70 defines production sync hardening contracts in `pipeline`:
  `SyncChangeKind` (`added`/`updated`/`unchanged`/`removed`),
  `SyncDocumentChange` / `SyncChangeSet`, `SyncLifecycleStatus` /
  `SyncLifecycleResult`, plus `KnowledgeSourceChangeDetector` (pure
  detect) and `KnowledgeSourceReconciler` (removed-document cleanup)
  ports. Adapters and reconciling orchestration are later tasks; the
  existing `SyncKnowledgeSourcePipeline` and `KnowledgeSourceConnector`
  remain unchanged.
- `DefaultKnowledgeSourceChangeDetector` (`app/knowledge/pipeline`)
  implements `KnowledgeSourceChangeDetector` with no constructor
  dependencies: it validates fetched/existing inputs, uses the same
  canonical id formula as `SyncKnowledgeSourcePipeline`, ignores
  existing documents from other sources, rejects duplicate fetched
  `externalId`s, and emits changes ordered by kind then `documentId`.
  Persistence, reconcile, and sync-pipeline orchestration remain later
  tasks.
- `VectorIndex.deleteByChunkId` removes a stored vector for
  `(workspaceId, chunkId)` and is a no-op when missing;
  `InMemoryVectorIndex` implements it with the same workspace isolation
  and input validation as other vector methods.
- `DefaultKnowledgeSourceReconciler` (`app/knowledge/pipeline`) injects
  only `KnowledgeDocumentRepository`, `DocumentChunkRepository`, and
  `VectorIndex`: for each removed document id it deletes chunk vectors,
  clears chunks, then deletes the document; missing documents are
  skipped; source mismatch throws and stops further deletes without
  rollback.
- `ReconcilingSyncKnowledgeSourcePipeline` (`app/knowledge/pipeline`)
  orchestrates source lookup → connector fetch → change detection →
  added/updated saves → removed reconcile, returning
  `SyncLifecycleResult` with `status: "completed"`. Whole-batch duplicate
  externalId and source-conflict checks run before any write or
  reconcile. Legacy `SyncKnowledgeSourcePipeline` remains unchanged.
  `SyncKnowledgeSourceJobHandler` injects only this reconciling pipeline
  and returns lifecycle summary fields (not `{ savedCount }`).
- `DocumentChunk` (`app/knowledge/domain`) is a traceable, orderable segment
  of a `KnowledgeDocument`'s text (`workspaceId`, `id`, `documentId`, `text`,
  `order`) — it deliberately omits `sourceId`, since provenance already
  flows through `documentId` → `KnowledgeDocument.sourceId`. `id` is a
  **workspace-global identity** (Task 23) — unique across every document in
  a workspace, not just within one document's own chunk set — so it can
  double as the `chunkId` a `VectorIndex` vector is keyed by.
  `DocumentChunkRepository` / `DefaultInMemoryDocumentChunkRepository`
  follow the same workspace-scoped, port/in-memory-adapter pattern as the
  document and source repositories: reads/writes of a document's own chunk
  set are still partitioned by `(workspaceId, documentId)`, while a second
  per-workspace ownership index enforces `id` uniqueness workspace-wide and
  backs `findById(workspaceId, chunkId)`. The only write method,
  `replaceForDocument`, swaps a document's entire chunk set in one call (an
  empty array clears it) after validating the whole batch — scope match,
  non-empty fields, unique/non-negative-integer `order` within the batch,
  and that no `id` in the batch is already owned by a *different* document
  in the same workspace (reusing an `id` the *same* document already owns
  is always allowed) — so no partial write is possible, either to storage
  or to the ownership index. `findByDocumentId` returns chunks sorted by
  `order` ascending. `findAll(workspaceId)` (Task 27) returns every chunk
  in the workspace, sorted deterministically by `documentId` ascending,
  then `order` ascending within a document, then `id` ascending as a final
  tie-break — never relying on `Map` iteration/insertion order — so a
  future keyword search or any other whole-workspace scan gets a stable,
  repeatable ordering. This repository does not verify that the referenced
  document exists.
- `ChunkingService` (`app/knowledge/embedding`) is a pure, synchronous port —
  `chunk(document: KnowledgeDocument): DocumentChunk[]` — with no I/O and no
  knowledge of storage, embeddings, or provenance. `FixedSizeDocumentChunker`
  is the dependency-free adapter: it splits `document.text` into fixed-size
  segments of at most `maxChunkLength` Unicode code points (via
  `Array.from`, so astral characters are never split mid-code-point),
  assigns each chunk the deterministic id
  `${encodeURIComponent(document.id)}:chunk:${order}` with a 0-based,
  contiguous `order`, and returns an empty array for empty text. It has no
  chunk-storage, chunk-generation-pipeline, natural-language-boundary, or
  embedding responsibility.
- `ChunkKnowledgeDocumentPipeline` (`app/knowledge/pipeline`) orchestrates
  `KnowledgeDocumentRepository`, `DocumentChunkRepository`, and
  `ChunkingService` — pure ports, never concrete adapters — to convert one
  already-stored `KnowledgeDocument` into chunks and fully replace that
  document's chunk set via `replaceForDocument`. If the document is not
  found (missing or a different workspace), it throws without ever calling
  the chunker or the chunk repository — no partial side effects. Since the
  chunker is deterministic and `replaceForDocument` always fully replaces,
  re-running with the same input is stable. Whole-source processing,
  automatic chunking during sync, and background jobs are out of scope for
  this pipeline.
- `RechunkKnowledgeSourcePipeline` (`app/knowledge/pipeline`) orchestrates
  `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`, and `Chunk
  KnowledgeDocumentPipeline` to re-chunk only the documents belonging to one
  `KnowledgeSource`. The source is looked up first — if missing or in a
  different workspace, it throws without ever listing documents or
  touching chunk storage — then it filters `findAll(workspaceId)` down to
  documents whose `sourceId` matches and delegates each to `Chunk
  KnowledgeDocumentPipeline`; other sources' documents/chunks are never
  read from or written to, and a source with no matching documents
  succeeds with a zero-count result. Automatic re-chunking during sync,
  deletion of documents/chunks removed from the source, and background
  scheduling/retry are out of scope for this pipeline.
- `EmbeddingProvider` (`app/knowledge/embedding`) is a port —
  `embed(text: string): Promise<number[]>` — for turning text into a
  fixed-`EMBEDDING_VECTOR_DIMENSION` (8) vector, with no storage or
  indexing knowledge. `FakeEmbeddingProvider` is the dependency-free
  adapter: it splits text into Unicode code points (via `Array.from`),
  accumulates each code point's value into one of 8 buckets
  (`index % EMBEDDING_VECTOR_DIMENSION`), then divides every bucket by the
  code point count — always a deterministic vector of exactly 8 finite
  numbers. It rejects an empty or whitespace-only string. No external AI
  provider, API key, network call, batch API, or vector storage/search
  belongs here.
- `VectorIndex` (`app/knowledge/embedding`) is a port —
  `upsert(vector: EmbeddingVector): Promise<void>`,
  `findByChunkId(workspaceId, chunkId): Promise<EmbeddingVector | null>`, and
  `findNearest(workspaceId, queryVector, limit): Promise<ScoredEmbeddingVector[]>`
  — treating `(workspaceId, chunkId)` as the vector's identity: `upsert`
  always replaces any existing vector for that identity, never
  accumulates. `InMemoryVectorIndex` is the dependency-free adapter,
  partitioned by `workspaceId` then `chunkId` (mirroring
  `DefaultInMemoryDocumentChunkRepository`'s pattern); it validates the
  vector's `workspaceId`/`chunkId` are non-empty and its `vector` has
  exactly `EMBEDDING_VECTOR_DIMENSION` finite-number entries before
  storing, and provides defensive copies on both write input and read
  output. `findNearest` (Task 24) ranks only vectors within the requested
  `workspaceId` by cosine similarity to `queryVector` — descending by
  score, then ascending by `chunkId` to break exact ties deterministically
  — returning at most `limit` (a required positive integer) defensive
  copies as `ScoredEmbeddingVector[]`; a zero-norm query or candidate
  vector scores `0` rather than throwing (cosine similarity is undefined
  at zero norm). It never imports `DocumentChunkRepository`,
  `KnowledgeDocumentRepository`, or `KnowledgeSourceRepository`, and has no
  chunk hydration, hybrid search, or re-ranking responsibility.
- `EmbedDocumentChunksPipeline` (`app/knowledge/pipeline`) orchestrates
  `DocumentChunkRepository`, `EmbeddingProvider`, and `VectorIndex` — pure
  ports, never concrete adapters — to embed one document's chunks (ordered
  via `findByDocumentId`) and upsert one vector per chunk, each carrying
  the chunk's own `workspaceId`/`id`. Every provider result's dimension and
  finite values are validated across the *entire* chunk set before any
  `VectorIndex.upsert` call, so one malformed provider result rejects the
  whole run with no partial vector-index writes. A document with no chunks
  succeeds with a zero-count result and no provider/vector-index call.
  Since `upsert` always replaces by `(workspaceId, chunkId)`, re-running
  against the same document never duplicates vectors. Document existence,
  whole-source processing, and any similarity search/retrieval concern are
  out of scope for this pipeline.
- `ReindexKnowledgeSourceEmbeddingsPipeline` (`app/knowledge/pipeline`)
  orchestrates `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`,
  and `EmbedDocumentChunksPipeline` — pure ports/pipelines, never concrete
  adapters — to re-embed only the documents belonging to one
  `KnowledgeSource`, mirroring `RechunkKnowledgeSourcePipeline`'s pattern
  exactly. The source is looked up first; if missing or in a different
  workspace, it throws without ever listing documents or touching the
  vector index. Otherwise it filters `findAll(workspaceId)` down to
  documents whose `sourceId` matches and delegates each to
  `EmbedDocumentChunksPipeline`; other sources' documents/vectors are
  never read from or written to, and a source with no matching documents
  succeeds with a zero-count result. Automatic reindexing during sync/
  rechunk, similarity search/retriever/hybrid search, background
  scheduling/retry, and Source/Document/Chunk deletion are out of scope
  for this pipeline.
- `VectorRetriever` (`app/knowledge/retrieval`) is a port —
  `retrieve(input: RetrievalInput): Promise<RetrievalResult>`, where
  `RetrievalInput` is `{ workspaceId, query, limit }` and `RetrievalResult`
  is `{ query, chunks: RetrievedChunk[] }` (`RetrievedChunk` = `{ chunk:
  DocumentChunk, score }`) — turning a natural-language query into ranked,
  hydrated chunks within one workspace. `DefaultVectorRetriever` is the
  adapter: it depends only on `EmbeddingProvider`, `VectorIndex`, and
  `DocumentChunkRepository` ports (never a concrete adapter), converts
  `query` to a vector via `EmbeddingProvider.embed`, ranks candidates via
  `VectorIndex.findNearest(workspaceId, queryVector, limit)`, and resolves
  each ranked result to its `DocumentChunk` via
  `DocumentChunkRepository.findById` — silently excluding a stale result
  whose chunk no longer exists rather than failing the request. It never
  re-sorts: `chunks` preserves `VectorIndex`'s own ranking order and never
  exceeds `limit` entries (though it may have fewer once stale vectors are
  excluded). Rejects an empty/whitespace `workspaceId`/`query` or a
  non-positive/non-integer `limit`. Keyword/hybrid retrieval, re-ranking,
  context assembly, and stale-vector cleanup are out of scope for this
  adapter.
- `RetrieveKnowledgeChunksUseCase` (`app/knowledge/application`) is the
  application-boundary entry point for retrieval: its constructor injects
  only the `VectorRetriever` port (never `EmbeddingProvider`, `VectorIndex`,
  `DocumentChunkRepository`, or a concrete adapter). It validates
  `workspaceId`/`query`/`limit` — its own `RetrieveKnowledgeChunksInput`,
  kept separate from `RetrievalInput` the same way `CreateKnowledgeSourceInput`
  is kept separate from `KnowledgeSource` — then delegates to
  `VectorRetriever.retrieve` and returns its `RetrievalResult` unchanged: no
  re-sorting, filtering, context assembly, or prompt/LLM concern here.
- `KeywordSearch` (`app/knowledge/search`) is a port —
  `search(input: RetrievalInput): Promise<RetrievalResult>` — reusing the
  retrieval module's `RetrievalInput`/`RetrievalResult` shapes so keyword
  and vector search are interchangeable at the boundary.
  `DefaultKeywordSearch` is the adapter: it depends only on the
  `DocumentChunkRepository` port (never `VectorIndex`, `EmbeddingProvider`,
  or a concrete adapter). It loads every chunk in the workspace via
  `DocumentChunkRepository.findAll`, tokenizes both `query` and each
  chunk's `text` into maximal runs of Unicode letters/numbers (lowercased),
  de-duplicates the query's tokens, and scores each chunk as the sum, over
  each unique query token, of that token's exact occurrence count in the
  chunk. Chunks scoring 0 are excluded; results are sorted by score
  descending, then chunk `id` ascending as a deterministic tie-break, and
  capped at `limit`. Rejects an empty/whitespace `workspaceId`/`query` or a
  non-positive/non-integer `limit`, consistent with `VectorRetriever`'s
  boundary. Stemming, synonyms, fuzzy matching, an external search engine,
  hybrid fusion, and re-ranking are out of scope for this adapter.
- `HybridSearch` (`app/knowledge/search`) is a port —
  `search(input: RetrievalInput): Promise<RetrievalResult>` — combining
  vector and keyword retrieval into one deterministic ranking via
  reciprocal-rank fusion (RRF). `DefaultHybridSearch` is the adapter: it
  depends only on the `VectorRetriever` and `KeywordSearch` ports (never a
  concrete adapter). It runs both searches with the same input, unions
  their results by chunk `id`, and computes each chunk's fused score as
  the sum, over every source that returned it, of `1 / (60 + rank)` for
  that source's 1-based rank (the standard RRF formula, `k = 60`); a chunk
  found by both sources sums both contributions into one merged entry
  using the chunk data already returned by a source (no re-hydration).
  Results sort by fused score descending, then chunk `id` ascending as a
  deterministic tie-break, capped at `limit`. Input is validated —
  identically to `VectorRetriever`/`KeywordSearch`'s boundary — before
  either dependency is called, so invalid input never reaches them.
  Cross-encoder/LLM re-ranking, score calibration/weighted fusion, and
  persistence changes to the vector index or chunk repository are out of
  scope for this adapter.
- `RetrieveHybridKnowledgeChunksUseCase` (`app/knowledge/application`) is
  the hybrid counterpart to `RetrieveKnowledgeChunksUseCase`: its
  constructor injects only the `HybridSearch` port (never
  `VectorRetriever`, `KeywordSearch`, `EmbeddingProvider`, `VectorIndex`,
  `DocumentChunkRepository`, or a concrete adapter). It validates
  `workspaceId`/`query`/`limit` — its own
  `RetrieveHybridKnowledgeChunksInput`, kept separate from `RetrievalInput`
  the same way `RetrieveKnowledgeChunksInput` is — then delegates to
  `HybridSearch.search` and returns its `RetrievalResult` unchanged.
  `RetrieveKnowledgeChunksUseCase` and the `VectorRetriever` contract are
  untouched by this use case.
- `ContextAssembler` (`app/knowledge/context`) is a port —
  `assemble(input: ContextAssemblyInput): Promise<GroundingContext>`, where
  `ContextAssemblyInput` is `{ workspaceId, query, chunks: RetrievedChunk[],
  maxCharacters }` and `GroundingContext` is `{ query, blocks:
  GroundingContextBlock[], content, truncated }` (`GroundingContextBlock` =
  `{ sourceId, documentId, chunkId, score, text }`) — turning ranked,
  retrieved chunks plus their document provenance into a bounded,
  deterministic grounding context for a downstream Prompt Builder /
  Citation capability. `DefaultContextAssembler` is the adapter: it depends
  only on the `KnowledgeDocumentRepository` port (never
  `DocumentChunkRepository`, `VectorIndex`, `EmbeddingProvider`,
  `HybridSearch`/`VectorRetriever`, or a concrete adapter). It processes
  `input.chunks` in the order given — never re-sorting — and for each
  chunk resolves `chunk.documentId` to its `KnowledgeDocument` via
  `KnowledgeDocumentRepository.findById(workspaceId, documentId)`,
  silently excluding a chunk whose document no longer exists (mirroring
  the vector retriever's stale-result skip) without counting it toward
  `truncated`. Each included block renders as fixed text —
  `[sourceId=<sourceId>;documentId=<documentId>;chunkId=<chunkId>]\n<chunk
  text>` — and is included only if the whole rendered block (plus its
  `"\n\n"` join separator, when not first) fits within the remaining
  `maxCharacters` budget; an oversized block is skipped whole (never
  truncated mid-text) and evaluation continues so a later, smaller block
  can still be included. `truncated` is `true` whenever at least one
  candidate block was excluded for exceeding the budget. An empty
  `chunks` input, or one where every candidate is stale or oversized,
  yields empty `blocks` and empty `content`. Prompt generation, citation
  objects, re-ranking, score calibration, and persistence changes are out
  of scope for this adapter.
- `RetrieveGroundingContextUseCase` (`app/knowledge/application`) combines
  reranked retrieval and context assembly behind one application-boundary
  entry point: its constructor injects only the `RerankedSearch` and
  `ContextAssembler` ports (never `HybridSearch`, `VectorRetriever`,
  `KeywordSearch`, `Reranker`, `EmbeddingProvider`, `VectorIndex`,
  `DocumentChunkRepository`, `KnowledgeDocumentRepository`, or a concrete
  adapter). It validates its own `RetrieveGroundingContextInput`
  (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) at the
  application boundary, then calls
  `RerankedSearch.search({ workspaceId, query, limit: retrievalLimit })`
  and passes the returned `RetrievalResult.chunks` (already re-ranked)
  straight into `ContextAssembler.assemble({ workspaceId, query, chunks,
  maxCharacters })`, returning its `GroundingContext` unchanged — no
  prompt building or citation concern here. This use case previously
  depended on `HybridSearch` directly (Task 33); Task 37 swapped that for
  `RerankedSearch` without changing the use case's own input contract or
  its delegation shape into `ContextAssembler`.
  `RetrieveHybridKnowledgeChunksUseCase` and `RetrieveKnowledgeChunksUseCase`
  are unaffected by this use case.
- `Reranker` (`app/knowledge/search`) is a port —
  `rerank(input: RerankingInput): Promise<RetrievedChunk[]>`, where
  `RerankingInput` is `{ workspaceId, query, chunks: RetrievedChunk[] }`
  — deterministically re-ordering (and optionally rescoring) an
  already-retrieved candidate set by query relevance within one
  workspace. It never introduces a new candidate or drops one, only
  reorders the ones it is given. `DefaultReranker` is the adapter: it has
  **no constructor dependency at all** — no repository, provider, or
  concrete adapter — and computes relevance purely from `query` and each
  candidate's own chunk text. `DefaultKeywordSearch`'s Unicode
  letter/number lowercased tokenization was extracted into a shared,
  unexported `tokenize` utility in `app/knowledge/search` so both
  adapters split/lowercase text identically; `DefaultKeywordSearch`'s own
  scoring behavior and public contract are unchanged by the extraction.
  For each candidate, `DefaultReranker` computes **coverage** (the
  fraction of the query's unique tokens that appear at least once in the
  chunk) and **density** (the fraction of the chunk's own tokens that are
  occurrences of a query token); both are `0` when the query or the
  chunk tokenizes to nothing. The reranked score is `coverage + density +
  <the candidate's original retrieved score>`, and results sort by that
  score descending, then chunk `id` ascending as a deterministic
  tie-break. Every candidate is returned, and neither the input array
  nor its `RetrievedChunk`/`DocumentChunk` objects are mutated — the
  adapter returns fresh objects. Input is validated — workspaceId/query
  as non-empty strings, `chunks` as an array of well-formed
  `RetrievedChunk`s with a finite `score` — before any scoring; a
  candidate's own `chunk.workspaceId` is validated for shape but never
  checked against `input.workspaceId`, since re-ranking has no data
  store to enforce that isolation against (the caller upstream owns it).
  Cross-encoder/LLM re-ranking, an external ranking service, expanding
  hybrid recall, and score calibration are out of scope for this adapter.
- `RerankedSearch` (`app/knowledge/search`) is a port —
  `search(input: RetrievalInput): Promise<RetrievalResult>` — a fourth,
  interchangeable way of turning a `(workspaceId, query, limit)` request
  into ranked, hydrated chunks, this time re-ranked. `DefaultRerankedSearch`
  is the adapter: it depends only on the `HybridSearch` and `Reranker`
  ports (never `VectorRetriever`, `KeywordSearch`, a concrete adapter, or
  either port's own adapter directly). It validates the `RetrievalInput`
  once at its own boundary, calls `HybridSearch.search` with it first,
  then passes that result's `chunks` into
  `Reranker.rerank({ workspaceId, query, chunks })` — the returned
  `RetrievedChunk[]` becomes this adapter's own `RetrievalResult.chunks`,
  in exactly the order `Reranker` returned them (never re-sorted a
  second time); `query` on the result is the validated input query.
  Invalid input is rejected before either dependency is called. The RRF
  fusion inside `DefaultHybridSearch` and the scoring inside
  `DefaultReranker` are both untouched by this adapter.
- `PromptBuilder` (`app/knowledge/prompt`) is a port —
  `build(context: GroundingContext): Promise<GroundedPrompt>`, where
  `GroundedPrompt` is `{ systemInstruction, userMessage }` (both plain
  strings) — turning a `GroundingContext` into an LLM-independent prompt
  representation. It reuses the context module's own `GroundingContext`
  shape and never re-retrieves, re-ranks, or re-assembles context; it
  only renders the context it is given. An LLM provider is this port's
  **output consumer**, never something `PromptBuilder` calls or
  constructs internally. `DefaultPromptBuilder` is the adapter: it has
  **no constructor dependency at all** — no repository,
  retrieval/search/context adapter, framework, or LLM provider.
  `systemInstruction` is always the same fixed instruction string
  (naming the assistant's role and its grounding-context-only
  constraint); `userMessage` is always the fixed format
  `Question:\n<query>\n\nGrounding context status:
  <complete|truncated>\n\nGrounding context:\n<content|[none]>`, where
  the status is `truncated` whenever `GroundingContext.truncated` is
  `true` and `complete` otherwise, and the grounding-context section is
  exactly `[none]` whenever `GroundingContext.content` is empty and the
  verbatim `content` otherwise — **never re-derived from `blocks`**, so
  the prompt never contains evidence outside what `ContextAssembler`
  already assembled. The input `GroundingContext` (and its `blocks`) are
  never mutated, and repeated calls with the same input return
  byte-identical output. Input is validated —
  `query`/`content` as strings, `truncated` as a boolean, `blocks` as an
  array of well-formed `GroundingContextBlock`s — before rendering.
  Prompt template configuration, per-request customization, and any LLM
  call are out of scope for this adapter.
- `BuildGroundedPromptUseCase` (`app/knowledge/application`) combines
  grounding-context retrieval and prompt building behind one
  application-boundary entry point: its constructor injects only
  `RetrieveGroundingContextUseCase` and the `PromptBuilder` port (never
  `RerankedSearch`, `HybridSearch`, `ContextAssembler`, any
  retrieval/search/context port, or a concrete adapter). It validates
  its own `BuildGroundedPromptInput`
  (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) at the
  application boundary, then calls
  `RetrieveGroundingContextUseCase.execute({ workspaceId, query,
  retrievalLimit, maxCharacters })` and passes the returned
  `GroundingContext` straight into `PromptBuilder.build(context)`,
  returning its `GroundedPrompt` unchanged — no LLM call, answer
  generation, or citation concern here.
  `RetrieveGroundingContextUseCase`'s own reranked-retrieval and
  context-assembly flow is unaffected by this use case. This is the
  first use case in this codebase to depend on another use case
  (`RetrieveGroundingContextUseCase`) rather than only on ports.
- `LanguageModelProvider` (`app/knowledge/ai`) is a port —
  `generate(prompt: GroundedPrompt): Promise<GeneratedText>`, where
  `GeneratedText` is `{ text: string }` — a provider-independent LLM
  generation request. `GroundedPrompt` is this port's **only** prompt
  input: a provider consumes it, it never constructs, rewrites, or
  re-derives a prompt of its own, and it never re-retrieves, re-ranks,
  or re-assembles grounding context — prompt construction is
  `PromptBuilder`'s responsibility alone. `GeneratedText` is plain
  generated text, **not yet** a grounded answer or citation — judging
  grounding sufficiency, structuring an answer, and attaching citations
  are all later, out-of-scope concerns. Only the contract is defined so
  far.
- `FakeLanguageModelProvider` (`app/knowledge/ai`) is the
  `LanguageModelProvider` adapter for validating the contract and
  downstream application flow: it has **no external dependency at
  all** — no network, API key, model SDK, repository, or
  retrieval/search/context/prompt-builder adapter. `generate` validates
  the given `GroundedPrompt` (`systemInstruction` a non-empty string,
  `userMessage` a string) and echoes `userMessage` back as
  `GeneratedText.text`, unchanged; it never constructs, rewrites, or
  re-derives a prompt of its own — prompt construction stays
  `PromptBuilder`'s responsibility. Neither the input prompt nor its
  fields are mutated, the returned `GeneratedText` is always a fresh
  object, and repeated calls with the same input return byte-identical
  output. This is a deterministic **validation-only** double, never a
  real answer generator — a real provider is a later task. Streaming,
  token usage, model configuration, answer parsing, grounding
  sufficiency judgment, and citation are all out of scope for this
  adapter.
- `GenerateGroundedTextUseCase` (`app/knowledge/application`) combines
  grounded-prompt construction and LLM generation behind one
  application-boundary entry point: its constructor injects only
  `BuildGroundedPromptUseCase` and the `LanguageModelProvider` port
  (never the grounding-context retrieval use case, a prompt builder, any
  retrieval/search/context port, or a concrete adapter). It validates
  its own `GenerateGroundedTextInput`
  (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) at the
  application boundary, then calls
  `BuildGroundedPromptUseCase.execute({ workspaceId, query,
  retrievalLimit, maxCharacters })` and passes the returned
  `GroundedPrompt` straight into
  `LanguageModelProvider.generate(prompt)`, returning its
  `GeneratedText` unchanged. `GeneratedText` here is plain generated
  text, **not yet** a grounded answer or citation — judging grounding
  sufficiency, structuring an answer, and attaching citations remain
  out of scope. `BuildGroundedPromptUseCase`'s own
  retrieval-then-prompt-building flow is unaffected by this use case.
  This is the second use case in this codebase to depend on another use
  case (`BuildGroundedPromptUseCase`) rather than only on ports.
- `GroundedAnswerAssembler` (`app/knowledge/rag`) is a port —
  `assemble(input: GroundedAnswerAssemblyInput): Promise<GroundedAnswer>`,
  where `GroundedAnswerAssemblyInput` is `{ context: GroundingContext,
  generatedText: GeneratedText }` and `GroundedAnswer` is `{ text,
  evidence: GroundingContextBlock[], insufficientEvidence }` — this is
  where the **insufficient-evidence policy** lives: whether the given
  generated text is even eligible to be returned as an answer depends
  solely on whether the given context carried any evidence, and that
  decision belongs to this port's implementation, never to
  `PromptBuilder` (prompt construction) or `LanguageModelProvider`
  (generation). It reuses the context and ai modules' own
  `GroundingContext`/`GeneratedText` shapes as-is — assembly never
  re-retrieves, re-ranks, re-assembles context, or re-invokes a
  provider. Citation formatting/identifiers remain out of scope.
- `DefaultGroundedAnswerAssembler` (`app/knowledge/rag`) is the
  `GroundedAnswerAssembler` adapter applying the insufficient-evidence
  policy deterministically: it has **no constructor dependency at
  all** — no framework, repository, provider, or
  search/context/prompt adapter. When `context.blocks` is empty, the
  given `generatedText` is **discarded** and never returned as an
  answer — `text` is always the fixed message "The available knowledge
  does not contain enough information.", `evidence` is `[]`, and
  `insufficientEvidence` is `true`. When `context.blocks` has at least
  one entry, the answer is `text: generatedText.text` (unchanged),
  `evidence` is a fresh copy of `context.blocks`, and
  `insufficientEvidence` is `false` — this holds even when
  `context.truncated` is `true`; **truncation alone is never treated as
  evidence absence**. Neither the input `context`/`generatedText` nor
  `context.blocks` are mutated; `evidence` is always a fresh array of
  fresh objects. Input is validated —
  `context.query`/`content`/`truncated`/`blocks` (each block's
  provenance/text shape) and `generatedText.text` — before assembling.
  Citation formatting/identifiers, generated-text factuality
  evaluation, and any provider/prompt/retrieval change are out of scope
  for this adapter.
- `GenerateGroundedAnswerUseCase` (`app/knowledge/application`)
  combines grounding-context retrieval, prompt construction, LLM
  generation, and evidence-bound answer assembly behind one
  application-boundary entry point: its constructor injects only
  `RetrieveGroundingContextUseCase`, the `PromptBuilder` port, the
  `LanguageModelProvider` port, and the `GroundedAnswerAssembler` port
  — never a concrete adapter, and never the standalone
  `BuildGroundedPromptUseCase`/`GenerateGroundedTextUseCase` use cases
  (this use case orchestrates the same retrieval-context/generated-text
  flow directly instead, so it can bind the exact same context and
  generated text together as one answer's evidence — reusing those
  other use cases would retrieve/generate twice and risk mismatched
  evidence). It validates its own `GenerateGroundedAnswerInput`
  (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) at the
  application boundary, then always calls
  `RetrieveGroundingContextUseCase.execute` first. When the returned
  `GroundingContext.blocks` is empty, `PromptBuilder.build` and
  `LanguageModelProvider.generate` are **never called** — it calls
  `GroundedAnswerAssembler.assemble({ context, generatedText: { text:
  "" } })` directly, so no generation happens and no generated text can
  be smuggled into an answer for a query with no evidence. When
  `GroundingContext.blocks` has at least one entry, it calls
  `PromptBuilder.build(context)` → `LanguageModelProvider.generate(prompt)`
  → `GroundedAnswerAssembler.assemble({ context, generatedText })` in
  that order, and returns the resulting `GroundedAnswer` unchanged. The
  existing `BuildGroundedPromptUseCase` and `GenerateGroundedTextUseCase`
  (and their own retrieval-then-prompt-building /
  prompt-then-generation flows) are unaffected by this use case; this
  is the third use case in this codebase to depend on another use case
  (`RetrieveGroundingContextUseCase`) rather than only on ports.
  Citation generation/display, a real LLM provider, streaming, token
  usage, factuality scoring, evaluation datasets, and HTTP/API/
  composition-root wiring are all out of scope for this use case.
- `CitationBuilder` (`app/knowledge/citation`) is a port —
  `build(answer: GroundedAnswer): Promise<Citation[]>`, where
  `Citation` is `{ id, sourceId, documentId, chunkId, score, excerpt }`
  and `CitedGroundedAnswer` is `{ answer: GroundedAnswer, citations:
  Citation[] }` — this is where the **evidence-only citation policy**
  lives: every citation must correspond to exactly one entry on
  `answer.evidence`, and an empty evidence list must produce an empty
  citation list — never a fabricated citation from answer text or an
  LLM extraction. It reuses the rag module's own `GroundedAnswer` shape
  as-is — citation construction never re-retrieves, re-ranks,
  re-assembles context, or rewrites answer text. Only the contract is
  Answer-text citation markers, document-title hydration, and LLM
  citation extraction remain out of scope.
- `DefaultCitationBuilder` (`app/knowledge/citation`) is the
  `CitationBuilder` adapter applying the evidence-only citation policy
  deterministically: it has **no constructor dependency at all** — no
  framework, repository, provider, or search/context/prompt adapter.
  It walks `answer.evidence` in the given order (never re-sorts) and
  emits exactly one `Citation` per block. `Citation.id` is
  `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`;
  `sourceId`/`documentId`/`chunkId`/`score` are copied from the block;
  `excerpt` is the block's own `text`, never truncated. An empty
  evidence list yields an empty `Citation[]` — **never a fabricated
  citation**. Neither the input answer nor its evidence array/entries
  are mutated; every returned citation is a fresh object. Input is
  validated — `answer.text`/`insufficientEvidence`/`evidence` (each
  block's provenance/text/score shape) — before building. Answer-text
  citation markers, document-title/source-name hydration, LLM citation
  extraction, and any grounded-answer policy change are out of scope
  for this adapter.
- `GenerateCitedGroundedAnswerUseCase` (`app/knowledge/application`)
  combines grounded-answer generation and citation building behind one
  application-boundary entry point: its constructor injects only
  `GenerateGroundedAnswerUseCase` and the `CitationBuilder` port —
  never a concrete adapter, and never the lower-level
  retrieval/prompt/provider/assembler ports those dependencies already
  own. It validates its own `GenerateCitedGroundedAnswerInput`
  (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) at the
  application boundary, then calls
  `GenerateGroundedAnswerUseCase.execute({ workspaceId, query,
  retrievalLimit, maxCharacters })` and passes the returned
  `GroundedAnswer` straight into `CitationBuilder.build(answer)`,
  returning `{ answer, citations }` as a `CitedGroundedAnswer`
  unchanged. The citation builder is **always** called — including for
  an insufficient-evidence answer — so an empty-evidence answer yields
  an empty citation list via the citation module's own evidence-only
  policy. The existing `GenerateGroundedAnswerUseCase` (and its own
  evidence-gated retrieval/prompt/generation/assembly flow) is
  unaffected by this use case; this is another use case that depends on
  a prior use case rather than only on ports. Answer-text citation
  markers, a real LLM provider, streaming, HTTP/API, MCP tool exposure,
  composition-root wiring, and evaluation datasets are all out of scope
  for this use case.
- `McpTool` (`app/knowledge/mcp`) is a port —
  `definition: McpToolDefinition` plus
  `invoke(args: Record<string, unknown>): Promise<McpToolInvokeResult>` —
  where `McpToolName` is currently the string-literal union
  `"generate_cited_grounded_answer"`, `McpToolDefinition` is
  `{ name, description, inputKeys: readonly string[] }`,
  `McpToolInvokeInput` is `{ name: McpToolName, arguments:
  Record<string, unknown> }`, and `McpToolInvokeResult` is
  `{ ok, toolName: McpToolName, result?: CitedGroundedAnswer,
  error?: string }`. This is a **transport-independent MCP capability
  exposure boundary**: it reuses the citation module's
  `CitedGroundedAnswer` as the success payload and never duplicates
  Domain/RAG business logic. Expected validation and use-case failures
  are expressed as `ok: false` results, not throws. (Task 52 widens
  `McpToolInvokeInput.name` and `McpToolInvokeResult.toolName` to plain
  `string` so a registry can echo unknown requested names.)
- `GenerateCitedGroundedAnswerMcpTool` (`app/knowledge/mcp`) is the
  `McpTool` adapter that exposes
  `GenerateCitedGroundedAnswerUseCase` as the fixed
  `generate_cited_grounded_answer` capability: its constructor injects
  only that use case; `definition` is fixed
  (`name`/`description`/`inputKeys:
  ["workspaceId","query","retrievalLimit","maxCharacters"]`); `invoke`
  validates those four keys with the same rules as the use case's
  application input, then returns `{ ok: true, toolName, result }` on
  success or `{ ok: false, toolName, error }` on invalid input /
  use-case failure — **never throws** across this boundary for those
  cases. No additional tools, registry, real MCP transport/SDK, or
  composition-root wiring are introduced here.
- `McpToolRegistry` (`app/knowledge/mcp`) is a port —
  `listTools(): Promise<McpToolDefinition[]>` and
  `invoke(input: McpToolInvokeInput): Promise<McpToolInvokeResult>` —
  where `McpToolInvokeInput.name` and `McpToolInvokeResult.toolName`
  are plain `string`s so unknown tool names can be rejected as
  structured `ok: false` results. `DefaultMcpToolRegistry` is the
  adapter: its constructor takes a readonly `McpTool[]`, rejects
  duplicate tool names, returns definitions in name-ascending order
  from `listTools`, delegates known invokes with arguments unchanged,
  and returns `{ ok: false, toolName: <requested name>, error:
  "Unknown MCP tool: <name>" }` for unknown names — never throws for
  unknown tools. Real MCP host/SDK, auth beyond existing workspace
  validation inside the tool, multi-tool business workflows, and
  composition-root wiring remain out of scope.
- `InvokeMcpToolUseCase` (`app/knowledge/application`) exposes MCP
  registry invoke behind one application-boundary entry point: its
  constructor injects only the `McpToolRegistry` port — never a
  concrete MCP tool or registry adapter. It validates its own
  `InvokeMcpToolInput` (`name: string`, `arguments:
  Record<string, unknown>`) at the application boundary, then calls
  `McpToolRegistry.invoke({ name, arguments })` and returns the
  `McpToolInvokeResult` unchanged. Real MCP transport, Agent
  planner/executor, multi-tool orchestration beyond a single invoke,
  HTTP/API/composition-root wiring, and auth middleware remain out of
  scope.
- `ToolExecutor` (`app/knowledge/tools`) is a port —
  `execute(request: ToolCallRequest): Promise<ToolCallResult>` — where
  `ToolCallStatus` is the string-literal union
  `"success" | "invalid_request" | "unknown_tool" | "timeout" |
  "failure"`, `ToolCallRequest` is `{ name, arguments, timeoutMs }`,
  and `ToolCallResult` is `{ ok, status, toolName, result?, error?,
  durationMs }`. This is a **transport-independent Tool Calling
  boundary** sitting above MCP capability exposure: it never duplicates
  Domain/RAG business logic and never depends on an MCP SDK, network
  transport, or Agent orchestrator. Expected validation, unknown-tool,
  timeout, and backend failures are expressed as `ok: false` results,
  not throws. `DefaultToolExecutor` (`app/knowledge/tools`) is the
  adapter: its constructor injects only the `McpToolRegistry` port —
  never an application use case or concrete MCP tool/registry adapter.
  It validates `name`/`arguments`/`timeoutMs`, returns
  `status: "invalid_request"` without calling the registry on bad
  input, maps `ok: true` MCP results to `status: "success"`, maps
  `"Unknown MCP tool: "` errors to `status: "unknown_tool"`, maps other
  `ok: false` results and registry throws to `status: "failure"`, and
  always returns a non-negative `durationMs` — never throws for those
  cases. Valid requests race the registry invoke against `timeoutMs`:
  when the timeout wins, it returns `status: "timeout"` with
  `error: "Tool call timed out after <timeoutMs>ms"` and ignores a
  later registry result; when the registry wins first, the existing
  success/unknown_tool/failure mapping is unchanged. No retry/backoff,
  circuit breaker, Agent-level deadline aggregation, `reliability`
  module implementation, or composition-root wiring are introduced
  here.
- `ExecuteToolCallUseCase` (`app/knowledge/application`) exposes tool
  calling behind one application-boundary entry point: its constructor
  injects only the `ToolExecutor` port — never a concrete tools/mcp
  adapter. It validates its own `ExecuteToolCallInput` (`name`,
  `arguments`, `timeoutMs`) at the application boundary (throwing on
  invalid input without calling the executor), then calls
  `ToolExecutor.execute({ name, arguments, timeoutMs })` and returns
  the `ToolCallResult` unchanged. The existing `InvokeMcpToolUseCase`
  is retained and unchanged. Retry policy, real MCP transport,
  HTTP/API/composition-root wiring remain out of scope.
- The `agent` module (`app/knowledge/agent`) is the role-separated
  Agent Orchestration boundary above Tool Calling. Task 58 defines
  `AgentRole`, `AgentGoal`, `AgentPlanStep`, `AgentPlan`,
  `AgentStepResult`, `AgentReviewDecision`, `AgentReviewResult`,
  `AgentExecutionStatus`, `AgentRunResult`, and the
  `AgentPlanner` / `AgentStepExecutor` / `AgentReviewer` /
  `AgentOrchestrator` ports so a knowledge-aware plan can be
  produced, executed via Tool Calling, and reviewed without Memory,
  LLM freeform planning, multi-agent collaboration, or
  composition-root wiring. `DeterministicKnowledgeAgentPlanner`
  (`app/knowledge/agent`) implements `AgentPlanner` with no
  constructor dependencies: it validates `AgentGoal`
  (`workspaceId`/`query` non-empty; `retrievalLimit`/`maxCharacters`/
  `toolTimeoutMs` positive integers), then always returns a single
  step (`id: "step-1"`, `toolName: "generate_cited_grounded_answer"`,
  arguments `{ workspaceId, query, retrievalLimit, maxCharacters }`)
  with a copied validated goal — byte-identical for identical inputs.
  It never imports ToolExecutor, an LLM provider, or a repository.
  `DefaultAgentStepExecutor` injects only the `ToolExecutor` port:
  it validates step id/toolName/arguments and positive `timeoutMs`,
  then calls `ToolExecutor.execute({ name: toolName, arguments,
  timeoutMs })` and returns `{ stepId, toolCall }` with the
  `ToolCallResult` unchanged. `DefaultAgentReviewer` has no
  constructor dependencies and judges only tool-call status / step
  count: mismatch → `"Step result count mismatch"`; any non-success
  status → `"Tool call did not succeed: <status>"`; all success →
  `"All tool calls succeeded"`. It never reinterprets Domain/RAG
  answer text. `DefaultAgentOrchestrator` injects only
  `AgentPlanner` / `AgentStepExecutor` / `AgentReviewer`: it plans,
  executes steps in order with `goal.toolTimeoutMs`, reviews, and maps
  status (`approved`→`completed`; `rejected` with any non-success tool
  call→`failed`; `rejected` with all-success tool calls→`rejected`).
  Thrown steps become `{ ok: false, status: "failure", durationMs: 0 }`
  and stop remaining steps while still reviewing. `RunAgentUseCase`
  (`app/knowledge/application`) injects only `AgentOrchestrator`,
  validates AgentGoal-shaped `RunAgentInput` at the application
  boundary (throwing without calling the orchestrator on invalid
  input), and returns `AgentRunResult` unchanged. Existing
  `ExecuteToolCallUseCase` / `InvokeMcpToolUseCase` are retained.
  LLM replanning, multi-agent collaboration beyond the three roles,
  background jobs, and composition-root wiring remain out of scope.
- The `memory` module (`app/knowledge/memory`) is the workspace/
  session-scoped Agent Memory boundary, separated from Knowledge
  document/chunk/vector search. Task 62 defines `MemoryEntryRole`,
  `MemoryEntry`, and the `MemoryStore` port (`append` /
  `listBySession`) so conversational turns can be stored and recalled
  without replacing Knowledge retrieval. `InMemoryMemoryStore`
  implements `MemoryStore` with validated append, deterministic
  `id`/`sequence`, sequence-ascending `listBySession`, workspace
  isolation, and defensive copies — never importing Knowledge/
  search/agent adapters. `AppendMemoryEntryUseCase` and `RecallMemoryEntriesUseCase`
  (`app/knowledge/application`) inject only `MemoryStore`: append
  validates and delegates; recall lists the session and, when `limit`
  is set, returns the newest `limit` entries still in sequence-
  ascending order (session memory window, not Knowledge search).
  `RunAgentWithMemoryUseCase` injects only `MemoryStore` and
  `AgentOrchestrator`: validates input, recalls session entries,
  appends the user query, runs the orchestrator with AgentGoal fields
  unchanged, appends a fixed agent summary
  (`status=<status>; decision=<review.decision>; reason=<review.reason>`),
  and returns `{ recalled, run, written }`. Existing `RunAgentUseCase`
  and Agent role adapters are unchanged; memory is not injected into
  the planner.
- The `jobs` module (`app/knowledge/jobs`) is the Background Job
  boundary for long-running Sync/Reindex pipeline work. Task 66 defines
  `JobType`, `JobStatus`, `JobRecord`, and the `JobStore` / `JobHandler` /
  `JobProcessor` ports so jobs can be enqueued and processed without
  real workers, cron, network brokers, or Domain business-logic
  duplication. `InMemoryJobStore` implements `JobStore` with validated enqueue,
  deterministic `id`/`sequence`, sequence-ascending lists, getById,
  save-replace, and workspace isolation. `SyncKnowledgeSourceJobHandler` injects only
  `ReconcilingSyncKnowledgeSourcePipeline` and returns lifecycle summary
  fields (`fetchedCount`, `addedCount`, `updatedCount`, `unchangedCount`,
  removed counts). `DefaultJobProcessor` injects `JobStore` + handlers,
  rejects duplicate types, processes oldest pending job
  (pending→running→completed/failed, retry while attempts < maxAttempts).
  `ReindexKnowledgeSourceJobHandler` injects only rechunk + reindex
  pipelines (rechunk failure short-circuits reindex). `EnqueueJobUseCase`
  injects only `JobStore`; `ProcessNextJobUseCase` injects only
  `JobProcessor`. Real workers/cron/composition wiring remain out of scope.
- The `evaluation` module (`app/knowledge/evaluation`) is the Knowledge
  Quality Evaluation boundary. Task 74 defines `EvaluationCase` /
  `EvaluationDataset`, retrieval/grounding/citation case scores and
  aggregate metrics, `EvaluationReport`, and the `RetrievalEvaluator` /
  `GroundingEvaluator` / `CitationEvaluator` ports for scoring
  pre-fetched `RetrievalResult` / `GroundedAnswer` / `CitedGroundedAnswer`
  artifacts without duplicating Domain/RAG logic. `DefaultRetrievalEvaluator`
  computes Hit@K and MRR with no constructor dependencies;
  `DefaultGroundingEvaluator` scores insufficient-evidence compliance
  (`insufficientEvidence` + empty evidence only).
  `RunRetrievalEvaluationUseCase` / `RunGroundingEvaluationUseCase`
  inject only their application use case + evaluator port.
  `DefaultCitationEvaluator` scores evidence-bound citation correctness;
  `RunCitationEvaluationUseCase` injects only
  `GenerateCitedGroundedAnswerUseCase` and `CitationEvaluator`.
  Real corpus loaders and LLM-as-judge remain later tasks.
- The `config` module (`app/knowledge/config`) defines
  `KnowledgeRuntimeConfig`, `loadKnowledgeRuntimeConfig` (plain-object
  validation + defensive copy, no `process.env`), and
  `DEFAULT_KNOWLEDGE_RUNTIME_CONFIG` for composition defaults.
- The `composition` module (`app/knowledge/composition`) provides
  `createInMemoryKnowledgeComposition`, which is the only place that
  imports concrete adapters for the cited-answer path and exposes
  `KnowledgeRuntime` with config-backed optional limit fallbacks.
- The `http` module provides framework-independent request/response types
  and `DefaultHttpRouter` (exact method+path match). The `api` module
  exposes health + cited-answer controllers that depend only on
  `KnowledgeRuntime`, plus `createKnowledgeHttpRouter`.
- The `server` module provides `DefaultKnowledgeServer` (start/stop/dispatch
  over `HttpRouter` only; no TCP) and an `HttpListener` contract for a
  separate TCP listen adapter in front of a router. `createInMemoryKnowledgeServer` in
  composition wires the full in-memory runtime entrypath.
- The `observability` module provides dependency-free `Logger`/`Metrics`
  ports with `InMemoryLogger`/`InMemoryMetrics` adapters.
- The `reliability` module provides deterministic `DefaultRetryPolicy`
  (no delay) and `DefaultTimeoutPolicy` (`Promise.race` + timer).
- The `security` module provides `Authenticator`/`AuthPrincipal`,
  `ApiKeyAuthenticator`, `HttpBearerGuard`, `DefaultWorkspaceAuthorizer`, and
  `HttpWorkspaceGuard`; cited-answer HTTP requires
  `Authorization: Bearer <api-key>` then workspace AuthZ against the principal.
- `ObservingHttpRouter` and `createOperationsKnowledgeServer` wire
  logging/metrics/AuthN+AuthZ for operations-ready in-process dispatch.
  `validate:deployment:readiness` checks Docker/docs/scripts statically
  without a Docker daemon.
- Real TCP listen / Express/Fastify and real AI provider wiring are not
  implemented as Express/Fastify. Post-baseline Sprint 25 adds
  `NodeHttpListener` (`node:http`) and `createListeningOperationsServer`;
  Express remains unused and dispatch-only servers are retained.
- Validate with `pnpm validate` (skeleton + repository + repository:source +
  repository:chunk + application + pipeline connector + pipeline sync +
  pipeline chunk-document + pipeline rechunk-source + pipeline
  embed-document + pipeline reindex-source + embedding chunker + embedding
  provider + embedding index + retrieval:vector + search:keyword +
  search:hybrid + search:rerank-contract + search:reranker +
  search:reranked + context:contract + context:assembler +
  prompt:contract + prompt:builder + application:grounding-context +
  application:prompt + ai:provider-contract + ai:fake-provider +
  application:generate-text + rag:answer-contract +
  rag:answer-assembler + application:grounded-answer +
  citation:contract + citation:builder + application:cited-answer +
  mcp:contract + mcp:cited-answer-tool + mcp:registry +
  application:mcp-invoke + tools:contract + tools:executor +
  application:tool-call + agent:contract + agent:planner +
  agent:step-executor + agent:reviewer + agent:orchestrator +
  application:run-agent + application:memory-append +
  application:memory-recall + application:run-agent-memory +
  memory:contract + memory:store + jobs:contract + jobs:store + jobs:sync-handler + jobs:processor + jobs:reindex-handler +
  application:enqueue-job + application:process-next-job +
  evaluation:contract + config:runtime + composition:in-memory + http:router + api:cited-answer + server:lifecycle + typecheck).

## 8. Project 2 Completion Boundary

Project 2 Platform Baseline is **complete** for dependency-free platform
capability. See [`docs/progress/PROJECT02_ROADMAP_STATUS.md`](progress/PROJECT02_ROADMAP_STATUS.md)
and [`docs/portfolio.md`](portfolio.md).

### Completed platform capability

Workspace isolation; Knowledge Source / Connector / Sync+Reconcile; Chunk /
Embedding / Vector; Hybrid + Rerank retrieval; Prompt / LLM / Grounding /
Citation; MCP / Tool Calling / Agent / Memory; Background Jobs; Evaluation;
Runtime (config, composition, HTTP/API, server lifecycle); Operations
(logger/metrics, retry/timeout, workspace guard, observing router, deployment
readiness).

### Composition-only concrete wiring

Concrete adapters are imported and wired **only** in
`app/knowledge/composition` (and the adapter's own module). Domain,
application, API controllers, and server depend on ports / runtime
abstractions — never on Postgres, OpenSearch, or real LLM SDKs.

### Deferred infrastructure

The following remain intentionally out of Project 2 scope:

- Postgres source-of-truth adapter
- OpenSearch (or other) real vector index adapter
- Real LLM provider SDK
- Real MCP network transport
- `node:http` / Express TCP listen
  (`NodeHttpListener` validated post-baseline; Express unused)

Project 2 Platform Baseline remains closed. Sprints 21–24 continue
post-baseline persistence (`SqlGateway`, document/source/chunk SQL
repositories, `PostgresSqlGateway`, and rebuildable `SqlVectorIndex` on
`embedding_vectors`). OpenSearch client remains deferred. Default
`pnpm validate` stays on InMemory/Fake paths without requiring a live
database. Default composition/operations paths stay in-memory.
