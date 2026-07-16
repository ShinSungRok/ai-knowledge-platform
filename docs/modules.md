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
delegating each match to `ChunkKnowledgeDocumentPipeline`.
Other modules remain skeleton boundaries until scoped.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`, `KnowledgeSource`, `DocumentChunk`), all workspace-scoped via `workspaceId`. Zero outward dependencies. |
| `application` | Use cases (list/page/create/update/delete/search/export for documents; create for sources), each scoped to a `workspaceId`, over domain types and ports. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository`, `KnowledgeSourceRepository`, `DocumentChunkRepository`); methods take `workspaceId` (chunk methods also take `documentId`). |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`, `DefaultInMemoryKnowledgeSourceRepository`, `DefaultInMemoryDocumentChunkRepository`; DB adapters later). |
| `pipeline` | Ingestion pipelines from external knowledge sources. `KnowledgeSourceConnector` port + `FakeKnowledgeSourceConnector` fixture adapter fetch normalized documents (`externalId`/`title`/`text`) for a `KnowledgeSource`; `SyncKnowledgeSourcePipeline` turns those into idempotent, deterministically-keyed `KnowledgeDocument` writes via the repository ports. `ChunkKnowledgeDocumentPipeline` chunks a single stored document via `ChunkingService` and fully replaces its chunk set via `DocumentChunkRepository`; `RechunkKnowledgeSourcePipeline` re-chunks every document of one source by delegating each to `ChunkKnowledgeDocumentPipeline`. No document/chunk deletion, automatic chunking during sync, background scheduling, or real connector yet. |
| `embedding` | Chunking, embedding, and vector indexing ports/adapters. `ChunkingService` port + `FixedSizeDocumentChunker` deterministic, fixed-size adapter split a `KnowledgeDocument` into ordered `DocumentChunk`s; no storage, pipeline, or embedding implementation yet. |
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
