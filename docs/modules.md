# Module Reference

## 1. Purpose

This document summarizes every major module under `app/knowledge/*`: its
responsibility and how it fits into the wider system. Each module has its own
`index.ts` barrel export. See [`docs/architecture.md`](architecture.md) for
dependency direction.

Module barrels are always present. Task 2 added the storage port/adapter pair.
Tasks 3–9 add list/page/create/update/delete/search/export application use
cases for knowledge documents. Task 10 scopes all of the above to a required
`workspaceId` — the minimal logical tenancy boundary (no Workspace entity or
repository yet). Task 11 adds a parallel, workspace-scoped registry for
`KnowledgeSource` (create-only). Task 12 links the two: `KnowledgeDocument`
carries a required `sourceId`, and `CreateKnowledgeDocumentUseCase` verifies
the referenced source exists in the same workspace before saving. Task 13
adds the `pipeline` module's `KnowledgeSourceConnector` outbound port and a
fixture-backed `FakeKnowledgeSourceConnector`, fetching normalized documents
for a `KnowledgeSource`. Task 14 adds `SyncKnowledgeSourcePipeline`, wiring
the connector plus both repository ports into an idempotent, deterministic-id
sync. Task 15 adds `DocumentChunk` plus a workspace/document-scoped
`DocumentChunkRepository` + `DefaultInMemoryDocumentChunkRepository` —
a replace-the-whole-set storage boundary. Task 16 adds the `embedding`
module's `ChunkingService` port and `FixedSizeDocumentChunker` — a pure,
deterministic function from `KnowledgeDocument` to ordered `DocumentChunk`s,
not yet wired to any storage or pipeline. Task 17 adds
`ChunkKnowledgeDocumentPipeline`, wiring the document repository, chunk
repository, and `ChunkingService` ports into a single-document chunk-and-
replace pipeline. Task 18 adds `RechunkKnowledgeSourcePipeline`, which
re-chunks every document of one source by filtering `findAll` and
delegating each match to `ChunkKnowledgeDocumentPipeline`. Task 19 adds the
`embedding` module's `EmbeddingProvider` port and `FakeEmbeddingProvider` —
a pure, deterministic function from text to a fixed-8-dimension vector, not
yet wired to any storage or pipeline. Task 20 adds `EmbeddingVector`,
`VectorIndex`, and `InMemoryVectorIndex` — a workspace/chunk-scoped
upsert-replaces storage boundary for vectors, mirroring
`DocumentChunkRepository`'s pattern. Task 21 adds
`EmbedDocumentChunksPipeline`, wiring the chunk repository, embedding
provider, and vector index ports into a single-document embed-and-upsert
pipeline that validates every provider result before any vector-index
write. Task 22 adds `ReindexKnowledgeSourceEmbeddingsPipeline`, which
re-embeds every document of one source by filtering `findAll` and
delegating each match to `EmbedDocumentChunksPipeline`. Task 23 makes
`DocumentChunk.id` a workspace-global identity: `DocumentChunkRepository`
gains `findById(workspaceId, chunkId)`, and `replaceForDocument` rejects a
batch that reuses an `id` already owned by a *different* document in the
same workspace, so `id` can double as the `chunkId` a `VectorIndex` vector
is keyed by. Task 24 adds `ScoredEmbeddingVector` and
`VectorIndex.findNearest(workspaceId, queryVector, limit)`, ranking vectors
within one workspace by cosine similarity — `InMemoryVectorIndex` sorts
descending by score, then ascending by `chunkId` to break ties.
Other modules remain skeleton boundaries until scoped.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`, `KnowledgeSource`, `DocumentChunk`), all workspace-scoped via `workspaceId`. Zero outward dependencies. |
| `application` | Use cases (list/page/create/update/delete/search/export for documents; create for sources), each scoped to a `workspaceId`, over domain types and ports. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository`, `KnowledgeSourceRepository`, `DocumentChunkRepository`); methods take `workspaceId` (chunk methods also take `documentId`, and `findById` resolves by `id` alone, a workspace-global identity). |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`, `DefaultInMemoryKnowledgeSourceRepository`, `DefaultInMemoryDocumentChunkRepository`; DB adapters later). |
| `pipeline` | Ingestion pipelines from external knowledge sources. `KnowledgeSourceConnector` port + `FakeKnowledgeSourceConnector` fixture adapter fetch normalized documents (`externalId`/`title`/`text`) for a `KnowledgeSource`; `SyncKnowledgeSourcePipeline` turns those into idempotent, deterministically-keyed `KnowledgeDocument` writes via the repository ports. `ChunkKnowledgeDocumentPipeline` chunks a single stored document via `ChunkingService` and fully replaces its chunk set via `DocumentChunkRepository`; `RechunkKnowledgeSourcePipeline` re-chunks every document of one source by delegating each to `ChunkKnowledgeDocumentPipeline`. `EmbedDocumentChunksPipeline` embeds one document's chunks via `EmbeddingProvider` and upserts one vector per chunk into `VectorIndex`, validating the whole result set before any write; `ReindexKnowledgeSourceEmbeddingsPipeline` re-embeds every document of one source by delegating each to `EmbedDocumentChunksPipeline`. No document/chunk deletion, automatic chunking/embedding during sync, background scheduling, or real connector yet. |
| `embedding` | Chunking, embedding, and vector indexing ports/adapters. `ChunkingService` port + `FixedSizeDocumentChunker` deterministic, fixed-size adapter split a `KnowledgeDocument` into ordered `DocumentChunk`s. `EmbeddingProvider` port + `FakeEmbeddingProvider` deterministic adapter turn text into a fixed-`EMBEDDING_VECTOR_DIMENSION` (8) vector. `VectorIndex` port + `InMemoryVectorIndex` adapter upsert/find an `EmbeddingVector` by `(workspaceId, chunkId)`; no similarity search/ranking or pipeline wiring yet. |
| `search` | Search engine abstraction (keyword, vector, hybrid). |
| `retrieval` | Retriever port consumed by the RAG flow. |
| `context` | Prompt context assembly from retrieved documents. |
| `prompt` | Prompt construction from context. |
| `citation` | Citation building from retrieved sources. |
| `rag` | RAG answer assembly (answer + citations). |
| `ai` | AI provider abstraction (fake + real providers). |
| `api` | Controllers and request/response DTOs. |
| `http` | Framework-independent HTTP abstraction. |
| `server` | Production server runtime and lifecycle. |
| `composition` | Composition root — wires concrete adapters. |
| `config` | Typed, validated, environment-driven configuration. |

## 3. Cross-cutting modules

| Module | Responsibility |
|---|---|
| `evaluation` | Quality, regression, and benchmark evaluation framework. |
| `observability` | Logging, metrics, and health-check foundations. |
| `reliability` | Retry, timeout, circuit breaker, error classification. |
| `security` | Rate limiting and input validation foundations. |
| `infra` | Local Docker infrastructure validation helpers. |

## 4. Top-level shape

```
app/knowledge/
  domain/
  repository/ persistence/ pipeline/
  embedding/ search/ retrieval/
  context/ prompt/ citation/ rag/
  ai/ application/
  api/ http/ server/
  composition/ config/
  evaluation/ observability/ reliability/ security/
  infra/
```
