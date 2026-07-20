# Architecture

## 1. Purpose

This document describes the architectural style this codebase follows, how
`app/knowledge/*` modules relate to one another, and which direction
dependencies are allowed to point. It is the map to read alongside
[`docs/modules.md`](modules.md).

Task 1 ships **module boundaries only** — no feature implementation. The
philosophy below is inherited from Project1 (`public-law-ai`) and is the
contract future phases must honor.

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
- Database adapters, HTTP/server, search, and AI provider wiring are not
  implemented yet.
- Validate with `pnpm validate` (skeleton + repository + repository:source +
  repository:chunk + application + pipeline connector + pipeline sync +
  pipeline chunk-document + pipeline rechunk-source + pipeline
  embed-document + pipeline reindex-source + embedding chunker + embedding
  provider + embedding index + typecheck).
