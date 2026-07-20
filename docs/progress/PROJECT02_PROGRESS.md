# Project 2 Progress Log

## Task 1

**Date**
2026-07-16

**Commit**
e747e95

**Title**
Initialize production project skeleton

**Summary**
- Created `app/knowledge/*` module boundaries and barrels
- Added docs, tests, scripts, docker, Cursor rules, agent skills
- Minimal TypeScript tooling (`typescript`, `tsx`, `@types/node`)
- Skeleton validation runner (`pnpm validate:skeleton`)

**Validation**
- `pnpm validate:skeleton`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 2

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add DefaultInMemoryRepository for domain storage

**Summary**
- Added `KnowledgeDocument` domain type
- Added `KnowledgeDocumentRepository` port under `repository/`
- Implemented `DefaultInMemoryRepository` adapter under `persistence/`
- Added repository validation runner and unit case inventory

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 3

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement basic query use case for knowledge items

**Summary**
- Added `ListKnowledgeDocumentsUseCase` in `application/`
- Use case depends only on `KnowledgeDocumentRepository` port
- Validation seeds `DefaultInMemoryRepository` and asserts list query behavior
- Wired `pnpm validate:application` into `pnpm validate`

**Status**
Completed

## Task 4

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement create use case for knowledge items

**Summary**
- Added `CreateKnowledgeDocumentUseCase` and input contract
- Create validates input, rejects duplicates, saves via repository port
- Validation covers persist + list visibility + invalid/duplicate paths
- Split `validate:application` into list + create runners

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 5

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement update use case for knowledge items

**Summary**
- Added `UpdateKnowledgeDocumentUseCase` with partial title/text patches
- Update rejects missing documents and empty/invalid patches
- Validation covers title-only, text-only, and error paths
- Extended `validate:application` with update runner

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 6

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement delete use case for knowledge items

**Summary**
- Extended `KnowledgeDocumentRepository` with `deleteById`
- Implemented `deleteById` on `DefaultInMemoryRepository`
- Added `DeleteKnowledgeDocumentUseCase` (not-found / invalid-id handling)
- Extended repository and application validation for delete

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 7

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement search use case for knowledge items

**Summary**
- Added `SearchKnowledgeDocumentsUseCase` with title/text field filters
- Case-insensitive substring match via repository `findAll` + application filter
- Tags deferred (not on `KnowledgeDocument` yet)
- Extended `validate:application` with search runner

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 8

**Date**
2026-07-16

**Commit**
962a9c2

**Title**
Implement sorting and paging use case for knowledge items

**Summary**
- Added `ListKnowledgeDocumentsPageUseCase` with sort + page input/output types
- Sorting limited to `id`/`title` (no creation-date field on domain model yet)
- Paging validates `page`/`pageSize` bounds and returns `totalCount`/`totalPages`
- Extended `validate:application` with page runner

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 9

**Date**
2026-07-16

**Commit**
Pending

**Title**
Implement export use case for knowledge items

**Summary**
- Added `ExportKnowledgeDocumentsUseCase` serializing all documents to `json` (default) or `csv`
- CSV output escapes commas/quotes/newlines per RFC 4180-style quoting
- Result carries `format`/`content`/`count`; no HTTP/file-system concerns in the use case
- Extended `validate:application` with export runner

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 10

**Date**
2026-07-16

**Commit**
Pending

**Title**
Scope knowledge documents by workspace

**Summary**
- Added required `workspaceId` to `KnowledgeDocument`; the same `id` now exists independently per workspace
- Changed `KnowledgeDocumentRepository` port (`findById`/`findAll`/`deleteById`) and `DefaultInMemoryRepository` to scope every read/write by `workspaceId`
- Added required `workspaceId` to every application use case input (list/page/create/update/delete/search/export); cross-workspace reads/writes are rejected as not-found or return empty results
- Extended repository + all application validation runners and unit-case inventories with same-id-across-workspaces and cross-workspace-isolation coverage
- No Workspace entity, CRUD, repository, or composition/HTTP wiring introduced — `workspaceId` is only a scoping value on the existing document contract

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 11

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add workspace-scoped knowledge source registry

**Summary**
- Added `KnowledgeSource` domain type (`workspaceId`, `id`, `name`), exported from the domain barrel
- Added `KnowledgeSourceRepository` port (`save`, `findById(workspaceId, id)`) and `DefaultInMemoryKnowledgeSourceRepository` adapter, reusing the same workspace-partitioned Map + defensive-copy pattern as the document repository
- Added `CreateKnowledgeSourceUseCase`: rejects empty/blank `workspaceId`/`id`/`name`, rejects duplicate `id` within a workspace, allows the same `id` independently in a different workspace
- Added `validate:repository:source` and `validate:application:source` runners plus unit-case inventories, wired into the top-level `validate` script and the `validate:application` chain
- No Workspace entity/CRUD, no Document–Source link, no Connector/Sync/HTTP — scope limited to source registration only

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:repository:source`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 12

**Date**
2026-07-16

**Commit**
Pending

**Title**
Enforce document source provenance

**Summary**
- Added required `sourceId` to `KnowledgeDocument` and `CreateKnowledgeDocumentInput`; empty/blank values are rejected the same way as other required fields
- Changed `CreateKnowledgeDocumentUseCase` to depend on both `KnowledgeDocumentRepository` and `KnowledgeSourceRepository`; before saving, it calls `KnowledgeSourceRepository.findById(workspaceId, sourceId)` and rejects (without saving) when the source is missing or registered in a different workspace
- `DefaultInMemoryRepository` validates `sourceId` as a required non-empty string on save but does not query source existence — provenance verification stays an application-layer responsibility
- `UpdateKnowledgeDocumentUseCase` preserves the original `sourceId` (no source-reassignment use case exists)
- `ExportKnowledgeDocumentsUseCase` CSV output now fixes column order to `id,sourceId,title,text`; JSON output already preserves `sourceId` as a document field
- Updated the repository validation runner and the create/export application validation runners (plus their unit-case inventories) with unregistered-source and cross-workspace-source-reference rejection cases and export provenance coverage; updated the remaining document use-case validation runners (list/page/update/delete/search) that seed documents through `CreateKnowledgeDocumentUseCase` or the repository directly, since the constructor/domain-shape change is a hard requirement of this task

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository`
- `pnpm validate:repository:source`
- `pnpm validate:application:create`
- `pnpm validate:application:export`
- `pnpm validate:application`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 13

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add knowledge source connector boundary

**Summary**
- Added `KnowledgeSourceConnector` outbound port in `app/knowledge/pipeline` with a single `fetchDocuments(source: KnowledgeSource)` method, and a `ConnectorDocument` return contract (`externalId`, `title`, `text` — no `workspaceId`/`sourceId` duplication, since the caller-supplied `KnowledgeSource` already carries that scope)
- Added `FakeKnowledgeSourceConnector`: a dependency-free adapter seeded with workspace + source-scoped fixtures; `fetchDocuments` returns only the fixture documents for the exact `(workspaceId, id)` requested, with defensive copies on both fixture input and fetched output, and returns an empty array (not an error) for a source with no fixture
- Constructor and `fetchDocuments` reject invalid identifiers/fixture values (empty `workspaceId`/`sourceId`/`externalId`/`title`, non-string `text`)
- Exported the new port and fake adapter from the `pipeline` barrel; `pipeline` depends only on the `KnowledgeSource` domain type — no persistence adapter import
- Added `validate:pipeline:connector` runner + `tests/unit/fakeKnowledgeSourceConnector.cases.ts`, wired into the top-level `validate` chain; no Sync, storage, real network, Chunk, or Source CRUD introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:pipeline:connector`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 14

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add idempotent knowledge source sync pipeline

**Summary**
- Added `SyncKnowledgeSourcePipeline` in `app/knowledge/pipeline`, injecting only `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`, and `KnowledgeSourceConnector` ports; `sync({ workspaceId, sourceId })` looks up the source first and returns without calling the connector or writing anything if it is missing or belongs to a different workspace
- Each fetched `ConnectorDocument` is validated (non-empty `externalId`/`title`, string `text`) and assigned a deterministic canonical id `${encodeURIComponent(sourceId)}:${encodeURIComponent(externalId)}` with no trimming/transformation of either value; the whole batch (including duplicate-`externalId`-within-batch and existing-document-under-a-different-`sourceId` conflicts) is validated and conflict-checked before any `save` call, so a single invalid or conflicting document rejects the entire sync with no partial writes
- Re-syncing the same `(sourceId, externalId)` pair resolves to the same canonical id and updates the existing document's `title`/`text` in place via `KnowledgeDocumentRepository.save` — no duplicate document is created
- Result is limited to `{ sourceId, fetchedCount, savedCount }`; exported `SyncKnowledgeSourcePipeline` from the `pipeline` barrel, which still depends only on domain types and the repository/connector ports — no concrete persistence adapter import
- Added `validate:pipeline:sync` runner + `tests/unit/syncKnowledgeSourcePipeline.cases.ts`, wired into the top-level `validate` chain; no real network/HTTP/DB connector, background job, document deletion, or Chunk/Embedding introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:pipeline:connector`
- `pnpm validate:pipeline:sync`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 15

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add traceable document chunk storage

**Summary**
- Added `DocumentChunk` domain type (`workspaceId`, `id`, `documentId`, `text`, `order`) — deliberately omits `sourceId`, since provenance already flows through `documentId` → `KnowledgeDocument.sourceId`
- Added `DocumentChunkRepository` port with `replaceForDocument(workspaceId, documentId, chunks)` (swaps a document's entire chunk set in one call; an empty array clears it) and `findByDocumentId(workspaceId, documentId)` (returns chunks sorted by `order` ascending)
- Added `DefaultInMemoryDocumentChunkRepository`: partitions storage by `workspaceId` then `documentId`, validates the entire incoming batch — scope match (`chunk.workspaceId`/`documentId` must equal the method arguments), non-empty `workspaceId`/`id`/`documentId`/`text`, unique chunk `id`, unique non-negative-integer `order` — before any mutation, and provides defensive copies on both write input and read output; depends only on the `DocumentChunk` domain type and its own port, never `KnowledgeDocumentRepository`/`KnowledgeSourceRepository`
- Exported the new type/port/adapter from the `domain`, `repository`, `persistence`, and top-level `app/knowledge` barrels
- Added `validate:repository:chunk` runner + `tests/unit/defaultInMemoryDocumentChunkRepository.cases.ts`, wired into the top-level `validate` chain; no chunking algorithm, chunk-generation pipeline, document-existence check, Embedding, or `application`/`pipeline` changes introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:repository:chunk`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 16

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add deterministic document chunker

**Summary**
- Added `ChunkingService` port in `app/knowledge/embedding`: a pure, synchronous `chunk(document: KnowledgeDocument): DocumentChunk[]` with no I/O, storage, or embedding knowledge
- Added `FixedSizeDocumentChunker(maxChunkLength)`: rejects a non-positive-integer `maxChunkLength`; splits `Array.from(document.text)` into segments of at most `maxChunkLength` Unicode code points (never breaking a surrogate pair/astral character), so chunking is deterministic and reproducible across repeated calls on the same input
- Each chunk carries the document's own `workspaceId`/`documentId`, a deterministic id `${encodeURIComponent(document.id)}:chunk:${order}`, and a 0-based contiguous `order`; empty `text` yields an empty array; output is independent across calls (mutating one result never affects a later `chunk()` call)
- Exported the new port/adapter from the `embedding` and top-level `app/knowledge` barrels
- Added `validate:embedding:chunker` runner + `tests/unit/fixedSizeDocumentChunker.cases.ts`, wired into the top-level `validate` chain; no chunk storage, Source-level processing, Embedding/Vector Index, or external chunking library introduced

**Validation**
- `pnpm validate:embedding:chunker`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 17

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add document chunking pipeline

**Summary**
- Added `ChunkKnowledgeDocumentPipeline` in `app/knowledge/pipeline`: constructor injects only `KnowledgeDocumentRepository`, `DocumentChunkRepository`, and `ChunkingService` (pure ports); `chunkDocument({ workspaceId, documentId })` returns `{ documentId, chunkCount }`
- Looks up the document via `findById(workspaceId, documentId)`; if missing or belonging to a different workspace, throws without ever calling the chunker or the chunk repository — no partial side effects
- If found, hands the document to the chunker and fully replaces the document's entire existing chunk set via `replaceForDocument` (stale chunks are never merged with new ones; an empty chunker result clears existing chunks)
- Since the chunker is deterministic and `replaceForDocument` always fully replaces, re-running with the same input is stable — verified with counting fakes proving no chunker/chunk-repository calls on a missing/cross-workspace document, full replacement over pre-seeded stale chunks, empty-text clearing, and repeat-run stability
- Exported the new pipeline from the `pipeline` barrel; added `validate:pipeline:chunk-document` runner + `tests/unit/chunkKnowledgeDocumentPipeline.cases.ts`, wired into the top-level `validate` chain; no whole-source processing, automatic chunking during sync, background jobs, chunker algorithm change, or `Document` CRUD change introduced

**Validation**
- `pnpm validate:embedding:chunker`
- `pnpm validate:pipeline:chunk-document`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 18

**Date**
2026-07-16

**Commit**
Pending

**Title**
Add source chunk rebuild pipeline

**Summary**
- Added `RechunkKnowledgeSourcePipeline` in `app/knowledge/pipeline`: constructor injects only `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`, and `ChunkKnowledgeDocumentPipeline`; `rechunk({ workspaceId, sourceId })` returns `{ sourceId, processedDocumentCount, savedChunkCount }`
- Looks up the source via `findById` first; if missing or belonging to a different workspace, throws without ever calling `findAll` or touching chunk storage — no partial side effects
- Filters `findAll(workspaceId)` down to documents whose `sourceId` matches the input and delegates each one to `ChunkKnowledgeDocumentPipeline`; documents/chunks belonging to other sources are never read from or written to, and a source with no matching documents succeeds with a zero-count result
- Since each delegated `chunkDocument` call is itself a full replace and deterministic, re-running `rechunk` for the same source does not duplicate chunks — verified with counting fakes proving no `findAll`/chunk-repository calls on a missing/cross-workspace source, cross-source chunk isolation via a pre-seeded stale chunk that must remain untouched, re-run stability, and the empty-source zero-count case
- Exported the new pipeline from the `pipeline` barrel; added `validate:pipeline:rechunk-source` runner + `tests/unit/rechunkKnowledgeSourcePipeline.cases.ts`, wired into the top-level `validate` chain; no automatic re-chunking during sync, deletion of documents/chunks removed from the source, background scheduling/retry, or Source CRUD/Connector change introduced

**Validation**
- `pnpm validate:embedding:chunker`
- `pnpm validate:pipeline:chunk-document`
- `pnpm validate:pipeline:rechunk-source`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 19

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic embedding provider

**Summary**
- Added `EMBEDDING_VECTOR_DIMENSION` (8) and `EmbeddingProvider` port (`embed(text: string): Promise<number[]>`) in `app/knowledge/embedding`, following Project1's (`public-law-ai`) `EmbeddingProvider`/`EmbeddingVectorDimension` naming pattern
- Added `FakeEmbeddingProvider`: splits text into Unicode code points via `Array.from` (never breaking a surrogate pair/astral character), accumulates each code point's value into one of 8 buckets (`index % EMBEDDING_VECTOR_DIMENSION`), then divides every bucket by the code point count — always a deterministic vector of exactly 8 finite numbers; rejects an empty or whitespace-only string
- No external AI provider, API key, network call, batch embedding API, vector storage, or Chunk Repository/pipeline change introduced
- Exported the new constant/port/adapter from the `embedding` and top-level `app/knowledge` barrels
- Added `validate:embedding:provider` runner + `tests/unit/fakeEmbeddingProvider.cases.ts`, wired into the top-level `validate` chain

**Validation**
- `pnpm validate:embedding:provider`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 20

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add workspace-scoped vector index

**Summary**
- Added `EmbeddingVector` type (`workspaceId`, `chunkId`, `vector`) and `VectorIndex` port (`upsert(vector)`, `findByChunkId(workspaceId, chunkId)`) in `app/knowledge/embedding`, following Project1's (`public-law-ai`) `EmbeddingVector`/`VectorIndexer` naming pattern
- Added `InMemoryVectorIndex`: partitions storage by `workspaceId` then `chunkId` (mirroring `DefaultInMemoryDocumentChunkRepository`'s pattern); `(workspaceId, chunkId)` is the vector identity, and `upsert` always fully replaces any existing vector for that identity, never accumulating
- `upsert` validates non-empty `workspaceId`/`chunkId`, a `vector` of exactly `EMBEDDING_VECTOR_DIMENSION` (8) entries, and every entry a finite number, before any write; provides defensive copies on both write input and read output; imports only its own port and `EMBEDDING_VECTOR_DIMENSION` — never `DocumentChunkRepository`, `KnowledgeDocumentRepository`, or `KnowledgeSourceRepository`
- No similarity search/ranking, document/chunk existence check, external vector database/OpenSearch, or `EmbeddingProvider` call introduced
- Exported the new type/port/adapter from the `embedding` and top-level `app/knowledge` barrels; added `validate:embedding:index` runner + `tests/unit/inMemoryVectorIndex.cases.ts`, wired into the top-level `validate` chain

**Validation**
- `pnpm validate:embedding:provider`
- `pnpm validate:embedding:index`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 21

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add document chunk embedding pipeline

**Summary**
- Added `EmbedDocumentChunksPipeline` in `app/knowledge/pipeline`: constructor injects only `DocumentChunkRepository`, `EmbeddingProvider`, and `VectorIndex` (pure ports); `embedDocument({ workspaceId, documentId })` returns `{ documentId, embeddedChunkCount }`
- Reads the document's chunks via `findByDocumentId` (already ordered); a document with no chunks succeeds with a zero-count result and never calls the provider or vector index
- Embeds every chunk, then validates the *entire* set of provider results (dimension === `EMBEDDING_VECTOR_DIMENSION`, all entries finite) before starting any `VectorIndex.upsert` — a single malformed result rejects the whole run with no partial vector-index writes, even when earlier chunks embedded successfully
- Each stored vector carries the originating chunk's own `workspaceId`/`id`; since `VectorIndex.upsert` always replaces by that identity, re-running against the same document replaces rather than duplicates vectors — verified with counting fakes proving zero provider/index calls for an empty-chunk document, per-chunk vector storage, workspace isolation, zero-write rejection of an invalid provider result (via a sequenced test-double provider), and re-run stability
- Exported the new pipeline from the `pipeline` barrel; added `validate:pipeline:embed-document` runner + `tests/unit/embedDocumentChunksPipeline.cases.ts`, wired into the top-level `validate` chain; no document-existence check, whole-source processing, similarity search/retrieval/ranking, chunk generation, or batch-provider/external-embedding-API change introduced

**Validation**
- `pnpm validate:embedding:provider`
- `pnpm validate:embedding:index`
- `pnpm validate:pipeline:embed-document`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 22

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add source embedding reindex pipeline

**Summary**
- Added `ReindexKnowledgeSourceEmbeddingsPipeline` in `app/knowledge/pipeline`, mirroring `RechunkKnowledgeSourcePipeline`'s pattern exactly: constructor injects only `KnowledgeSourceRepository`, `KnowledgeDocumentRepository`, and `EmbedDocumentChunksPipeline`; `reindex({ workspaceId, sourceId })` returns `{ sourceId, processedDocumentCount, embeddedChunkCount }`
- Looks up the source via `findById` first; if missing or belonging to a different workspace, throws without ever calling `findAll` or touching the vector index — no partial side effects
- Filters `findAll(workspaceId)` down to documents whose `sourceId` matches the input and delegates each one to `EmbedDocumentChunksPipeline`; documents/vectors belonging to other sources are never read from or written to, and a source with no matching documents succeeds with a zero-count result
- Since each delegated `embedDocument` call upserts by `(workspaceId, chunkId)` identity, re-running `reindex` for the same source replaces rather than duplicates vectors — verified with counting fakes proving no `findAll`/vector-index calls on a missing/cross-workspace source, cross-source vector isolation via a pre-seeded stale vector that must remain untouched, re-run stability, and the empty-source zero-count case
- Exported the new pipeline from the `pipeline` barrel; added `validate:pipeline:reindex-source` runner + `tests/unit/reindexKnowledgeSourceEmbeddingsPipeline.cases.ts`, wired into the top-level `validate` chain; no automatic reindexing during sync/rechunk, similarity search/retriever/hybrid search, background scheduling/retry, or Source/Document/Chunk deletion introduced

**Validation**
- `pnpm validate:embedding:provider`
- `pnpm validate:embedding:index`
- `pnpm validate:pipeline:embed-document`
- `pnpm validate:pipeline:reindex-source`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 23

**Date**
2026-07-20

**Commit**
Pending

**Title**
Establish workspace-global chunk identity lookup

**Summary**
- Made `DocumentChunk.id` a workspace-global identity (updated the domain doc comment): unique across every document in a workspace, not just within one document's own chunk set, so it can double as the `chunkId` a `VectorIndex` vector is keyed by
- Added `findById(workspaceId, chunkId): Promise<DocumentChunk | null>` to `DocumentChunkRepository` and implemented it in `DefaultInMemoryDocumentChunkRepository` via a new per-workspace `chunkId → documentId` ownership index, with defensive copies on read
- `replaceForDocument` now rejects (before any mutation of storage or the ownership index) a batch that reuses an `id` already owned by a *different* document in the same workspace; reusing an `id` the *same* document already owns (e.g. re-chunking with `FixedSizeDocumentChunker`'s deterministic id scheme) remains allowed and updates the ownership index correctly
- Updated the two existing `CountingDocumentChunkRepository` test doubles (`runChunkKnowledgeDocumentPipelineValidation.ts`, `runRechunkKnowledgeSourcePipelineValidation.ts`) with a pass-through `findById`, and fixed one pre-existing repository test that relied on reusing the same chunk id across two documents in the same workspace — a scenario the new invariant now correctly rejects
- Extended `runDefaultInMemoryDocumentChunkRepositoryValidation.ts` + `tests/unit/defaultInMemoryDocumentChunkRepository.cases.ts` with cases for `findById` resolution/isolation, same-document id reuse, cross-document conflict rejection with no partial write, and `FixedSizeDocumentChunker`-generated id compatibility across two different documents; no chunk text/order/algorithm change, similarity search, Retriever, Application Use Case, or external database/index adapter introduced

**Validation**
- `pnpm validate:repository:chunk`
- `pnpm validate:embedding:chunker`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 24

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add vector nearest-neighbor query

**Summary**
- Added `ScoredEmbeddingVector` (`{ vector: EmbeddingVector; score: number }`) to `embedding`, and `VectorIndex.findNearest(workspaceId, queryVector, limit): Promise<ScoredEmbeddingVector[]>` to the port
- Implemented `findNearest` in `InMemoryVectorIndex`: ranks only vectors within the requested `workspaceId` by cosine similarity to `queryVector`, sorted score descending then `chunkId` ascending for deterministic tie-breaking, truncated to `limit`, each result a defensive copy; a zero-norm query or candidate vector scores `0` instead of dividing by zero
- Validates `queryVector` is exactly `EMBEDDING_VECTOR_DIMENSION` finite numbers and `limit` is a positive integer, rejecting otherwise with no partial results
- Updated the two existing `CountingVectorIndex` test doubles (`runEmbedDocumentChunksPipelineValidation.ts`, `runReindexKnowledgeSourceEmbeddingsPipelineValidation.ts`) with a pass-through `findNearest`; exported `ScoredEmbeddingVector` from the `embedding` and top-level barrels
- Extended `runInMemoryVectorIndexValidation.ts` + `tests/unit/inMemoryVectorIndex.cases.ts` with cases for cosine ranking, workspace isolation, tie-breaking, zero-norm scoring, limit truncation, defensive copies, and invalid query/limit rejection; no Retriever, chunk hydration, Application Use Case, hybrid search/re-ranking, external vector database, or vector deletion API introduced

**Validation**
- `pnpm validate:embedding:index`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed
