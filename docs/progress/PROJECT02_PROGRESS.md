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

## Task 25

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add default vector retriever

**Summary**
- Added `RetrievalInput` (`workspaceId`, `query`, `limit`), `RetrievalResult`/`RetrievedChunk` (`{ chunk: DocumentChunk, score }`), and the `VectorRetriever` port (`retrieve(input): Promise<RetrievalResult>`) to `retrieval`, following Project 1's `Retriever`/`RetrievalResult` shape
- Added `DefaultVectorRetriever`, injecting only `EmbeddingProvider`, `VectorIndex`, and `DocumentChunkRepository` ports: converts `query` to a vector via `EmbeddingProvider.embed`, ranks via `VectorIndex.findNearest(workspaceId, queryVector, limit)`, then hydrates each ranked result to its `DocumentChunk` via `DocumentChunkRepository.findById` — silently excluding a stale result whose chunk no longer exists, and never re-sorting (preserves `VectorIndex`'s ranking order, capped at `limit`)
- Rejects an empty/whitespace `workspaceId`/`query` or a non-positive/non-integer `limit` before any provider/index/repository call
- Exported the new types/port/adapter from the `retrieval` and top-level `app/knowledge` barrels; added `validate:retrieval:vector` runner (using `FakeEmbeddingProvider`, `InMemoryVectorIndex`, `DefaultInMemoryDocumentChunkRepository` fakes) + `tests/unit/defaultVectorRetriever.cases.ts`, wired into the top-level `validate` chain
- Validation includes a static source-scan asserting `DefaultVectorRetriever.ts` never references a concrete adapter or the `persistence` module; no Application Use Case, keyword/hybrid retrieval, re-ranking, context assembly, or stale-vector cleanup introduced

**Validation**
- `pnpm validate:repository:chunk`
- `pnpm validate:embedding:provider`
- `pnpm validate:embedding:index`
- `pnpm validate:retrieval:vector`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 26

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add retrieve knowledge chunks use case

**Summary**
- Added `RetrieveKnowledgeChunksUseCase` + its own `RetrieveKnowledgeChunksInput` (`workspaceId`, `query`, `limit`) to `application`, mirroring how `CreateKnowledgeSourceInput` is kept separate from its domain type rather than reusing the retrieval module's `RetrievalInput` directly
- Constructor injects only the `VectorRetriever` port — never `EmbeddingProvider`, `VectorIndex`, `DocumentChunkRepository`, or a concrete adapter; `execute` validates `workspaceId`/`query`/`limit` at the application boundary, then delegates to `VectorRetriever.retrieve` and returns its `RetrievalResult` unchanged (no re-sorting/filtering/context assembly)
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `validate:application:retrieve` runner (a static source-scan confirming the use case only imports the `VectorRetriever` port, plus a counting `VectorRetriever` test double proving invalid input is rejected before any `retrieve` call and valid input passes through with the result unchanged) + `tests/unit/retrieveKnowledgeChunksUseCase.cases.ts`, wired into `validate:application` (and therefore the top-level `validate` chain); no HTTP/API controller, Composition Root wiring, context assembly, prompt/LLM, keyword/hybrid retrieval, re-ranking, or additional source filtering introduced

**Validation**
- `pnpm validate:retrieval:vector`
- `pnpm validate:application:retrieve`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 27

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add workspace-scoped document chunk discovery

**Summary**
- Added `DocumentChunkRepository.findAll(workspaceId): Promise<DocumentChunk[]>`, returning every chunk in a workspace ordered deterministically by `documentId` ascending, then `order` ascending within a document, then `id` ascending as a final tie-break — never relying on `Map` iteration/insertion order
- Implemented `findAll` in `DefaultInMemoryDocumentChunkRepository` by scanning the workspace's own `chunksByWorkspace` partition and sorting the flattened result; rejects an empty/whitespace `workspaceId`; returns defensive copies
- Updated the two existing `CountingDocumentChunkRepository` test doubles (`runChunkKnowledgeDocumentPipelineValidation.ts`, `runRechunkKnowledgeSourcePipelineValidation.ts`) with a pass-through `findAll`
- Extended `runDefaultInMemoryDocumentChunkRepositoryValidation.ts` + `tests/unit/defaultInMemoryDocumentChunkRepository.cases.ts` with cases for deterministic ordering across multiple documents/chunks regardless of insertion order, workspace isolation, empty-workspace result, defensive copy, and invalid-input rejection; no keyword scoring/search module, vector index change, or chunk write contract change introduced

**Validation**
- `pnpm validate:repository:chunk`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 28

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic keyword search

**Summary**
- Added `app/knowledge/search/KeywordSearch.ts` (`search(input: RetrievalInput): Promise<RetrievalResult>`), reusing the retrieval module's `RetrievalInput`/`RetrievalResult` shapes so keyword and vector search are interchangeable at the boundary
- Added `DefaultKeywordSearch`, injecting only the `DocumentChunkRepository` port (never `VectorIndex`/`EmbeddingProvider`/a concrete adapter): loads every workspace chunk via `findAll`, tokenizes `query` and each chunk's `text` into lowercased maximal runs of Unicode letters/numbers, de-duplicates query tokens, and scores each chunk as the sum of each unique query token's exact occurrence count in the chunk; chunks scoring 0 are excluded, results sort by score descending then chunk `id` ascending, capped at `limit`; validates `workspaceId`/`query`/`limit` identically to `DefaultVectorRetriever`'s boundary
- Added `runDefaultKeywordSearchValidation.ts` (port contract, ranking-by-match-count, case-insensitivity, query-token de-duplication, zero-score exclusion, tie-break, limit, workspace isolation, invalid-input rejection, and a source-scan confirming no concrete adapter is imported) + `tests/unit/defaultKeywordSearch.cases.ts`
- Added `validate:search:keyword` to `package.json`, wired into the top-level `validate` chain; updated `search` and top-level `app/knowledge` barrels to export `KeywordSearch`/`DefaultKeywordSearch`; no vector retrieval change, hybrid fusion, stemming/synonym/fuzzy matching, external search engine, or re-ranking/evaluation framework introduced

**Validation**
- `pnpm validate:repository:chunk`
- `pnpm validate:search:keyword`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 29

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add reciprocal-rank-fusion hybrid search

**Summary**
- Added `app/knowledge/search/HybridSearch.ts` (`search(input: RetrievalInput): Promise<RetrievalResult>`), reusing the same `RetrievalInput`/`RetrievalResult` shapes as `VectorRetriever` and `KeywordSearch`
- Added `DefaultHybridSearch`, injecting only the `VectorRetriever` and `KeywordSearch` ports (never a concrete adapter): runs both with the same input, unions results by chunk `id`, and sums `1 / (60 + rank)` (1-based rank, `k = 60`) per source a chunk was returned by; a chunk found by both sources merges into one entry with both contributions summed. Results sort by fused score descending, then chunk `id` ascending, capped at `limit`. Input is validated (identical rules to `VectorRetriever`/`KeywordSearch`) before either dependency is called, so invalid input never reaches them
- Added `runDefaultHybridSearchValidation.ts` (port contract, vector-only fusion, keyword-only fusion, overlapping-result merge/sum, combined-score ranking, deterministic tie-break, workspace pass-through/isolation, limit, invalid-input rejection without calling either dependency, and a source-scan confirming no concrete adapter is imported) + `tests/unit/defaultHybridSearch.cases.ts`; vector-only/tie-break cases exploit `FakeEmbeddingProvider`'s bucket-average behavior, where any two same-length, same-repeated-character strings produce all-equal-valued vectors with cosine similarity exactly 1.0 despite sharing no keyword tokens
- Added `validate:search:hybrid` to `package.json`, wired into the top-level `validate` chain; updated `search` and top-level `app/knowledge` barrels to export `HybridSearch`/`DefaultHybridSearch`; `DefaultVectorRetriever`'s vector-only retrieval path is unchanged; no cross-encoder/LLM re-ranking, score calibration/weighted fusion, or persistence change to `VectorIndex`/`DocumentChunkRepository` introduced

**Validation**
- `pnpm validate:retrieval:vector`
- `pnpm validate:search:keyword`
- `pnpm validate:search:hybrid`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 30

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add retrieve hybrid knowledge chunks use case

**Summary**
- Added `RetrieveHybridKnowledgeChunksUseCase` + its own `RetrieveHybridKnowledgeChunksInput` (`workspaceId`, `query`, `limit`) to `application`, mirroring how `RetrieveKnowledgeChunksInput` is kept separate from `RetrievalInput` rather than reusing the search module's input type directly
- Constructor injects only the `HybridSearch` port — never `VectorRetriever`, `KeywordSearch`, `EmbeddingProvider`, `VectorIndex`, `DocumentChunkRepository`, or a concrete adapter; `execute` validates `workspaceId`/`query`/`limit` at the application boundary, then delegates to `HybridSearch.search` and returns its `RetrievalResult` unchanged (no re-sorting/filtering/context assembly); the existing `RetrieveKnowledgeChunksUseCase` and `VectorRetriever` contract are unchanged
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runRetrieveHybridKnowledgeChunksUseCaseValidation.ts` (a static source-scan confirming the use case only imports the `HybridSearch` port, plus a counting `HybridSearch` test double proving invalid input is rejected before any `search` call and valid input passes through with the result unchanged) + `tests/unit/retrieveHybridKnowledgeChunksUseCase.cases.ts`, wired into `validate:application:retrieve-hybrid`, `validate:application` (and therefore the top-level `validate` chain); no HTTP/API controller, Composition Root wiring, context assembly, prompt/LLM, cross-encoder re-ranking, or vector retrieval use case change introduced

**Validation**
- `pnpm validate:search:hybrid`
- `pnpm validate:application:retrieve-hybrid`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 31

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define grounding context assembly contract

**Summary**
- Added `app/knowledge/context/ContextAssemblyInput.ts` (`{ workspaceId, query, chunks: RetrievedChunk[], maxCharacters }`, reusing `RetrievedChunk` from the retrieval module), `app/knowledge/context/GroundingContext.ts` (`GroundingContextBlock` = `{ sourceId, documentId, chunkId, score, text }`; `GroundingContext` = `{ query, blocks: GroundingContextBlock[], content, truncated }`), and `app/knowledge/context/ContextAssembler.ts` (`assemble(input: ContextAssemblyInput): Promise<GroundingContext>` port)
- Updated the `context` and top-level `app/knowledge` barrels to export the new types; no rendering algorithm, adapter, hybrid-search call, or application use case implemented — contract only
- Added `runGroundingContextContractValidation.ts` (module-constant check, an in-file `FakeContextAssembler` test double proving the port is implementable/callable from just the exported types with correct field shapes, an empty-chunk-list case, and a compile-time type-assignability check that the top-level barrel re-exports the same `ContextAssembler` type) + `tests/unit/groundingContextContract.cases.ts`
- Added `validate:context:contract` to `package.json`, wired into the top-level `validate` chain; no context rendering, hybrid search invocation, application use case, prompt/LLM, or citation code introduced

**Validation**
- `pnpm validate:context:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 32

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic grounding context assembler

**Summary**
- Added `DefaultContextAssembler` (`app/knowledge/context/DefaultContextAssembler.ts`), the `ContextAssembler` adapter, injecting only the `KnowledgeDocumentRepository` port; processes `input.chunks` in the given ranking order (never re-sorts), and for each chunk resolves `chunk.documentId` to its `KnowledgeDocument` via `findById(workspaceId, documentId)` (workspace-scoped; a stale chunk whose document no longer exists is silently excluded, mirroring the vector retriever's stale-result skip, and is never counted toward `truncated`)
- Fixed rendered block format to `[sourceId=<sourceId>;documentId=<documentId>;chunkId=<chunkId>]\n<chunk text>`, joined by `"\n\n"`; a candidate block is included only if the whole rendered block (including its join separator) fits the remaining `maxCharacters` budget — an oversized block is skipped whole (never truncated mid-text) and evaluation continues so a later, smaller block can still be included; `truncated` is `true` whenever at least one candidate was excluded by budget; an empty `chunks` input, or one where every candidate is stale or oversized, yields empty `blocks`/`content`
- Validates `workspaceId`/`query`/`chunks`/`maxCharacters` and each `RetrievedChunk`'s required identifiers (`chunk.workspaceId`/`chunk.id`/`chunk.documentId`/`chunk.text`, `score`) at the adapter boundary before any repository call
- Exported `DefaultContextAssembler` from the `context` and top-level `app/knowledge` barrels
- Added `runDefaultContextAssemblerValidation.ts` (port contract; provenance hydration + ranking-order preservation; workspace isolation of document hydration; stale-document skip without setting `truncated`; fixed-format rendering; whole-block budget adherence with continued evaluation past an oversized candidate; truncation when a later block exceeds the remaining budget; empty-chunks and all-stale-or-oversized edge cases; invalid-input rejection; static source-scan confirming only port imports) + `tests/unit/defaultContextAssembler.cases.ts`, wired into `validate:context:assembler` and the top-level `validate` chain
- Updated `docs/modules.md`/`docs/architecture.md`/`docs/development.md`: replaced outdated "hybrid retrieval/context assembly still deferred" phrasing in the `embedding`/`retrieval` module descriptions (both are now implemented) and documented `DefaultContextAssembler`'s actual hydration/rendering/budget behavior; no prompt generation, citation object, re-ranking, score calibration, persistence, or composition-root change introduced

**Validation**
- `pnpm validate:repository`
- `pnpm validate:context:contract`
- `pnpm validate:context:assembler`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 33

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add retrieve grounding context use case

**Summary**
- Added `RetrieveGroundingContextUseCase` + its own `RetrieveGroundingContextInput` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`) to `application`, mirroring how `RetrieveHybridKnowledgeChunksInput` is kept separate from `RetrievalInput`/`ContextAssemblyInput` rather than reusing a port's input type directly
- Constructor injects only the `HybridSearch` and `ContextAssembler` ports — never `VectorRetriever`, `KeywordSearch`, `EmbeddingProvider`, `VectorIndex`, `DocumentChunkRepository`, `KnowledgeDocumentRepository`, or a concrete adapter; `execute` validates `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the application boundary, then calls `HybridSearch.search({ workspaceId, query, limit: retrievalLimit })` and passes the returned `RetrievalResult.chunks` straight into `ContextAssembler.assemble({ workspaceId, query, chunks, maxCharacters })`, returning its `GroundingContext` unchanged; the existing `RetrieveHybridKnowledgeChunksUseCase` and `RetrieveKnowledgeChunksUseCase` are unaffected
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runRetrieveGroundingContextUseCaseValidation.ts` (a static source-scan confirming the use case only imports the `HybridSearch`/`ContextAssembler` ports; a real hybrid-search + real context-assembler harness with counting test doubles proving `HybridSearch.search` is called before `ContextAssembler.assemble`, each dependency receives correctly-mapped input, and the returned `GroundingContext` matches a direct call sequence; invalid input rejected before either dependency is called) + `tests/unit/retrieveGroundingContextUseCase.cases.ts`, wired into `validate:application:grounding-context`, `validate:application` (and therefore the top-level `validate` chain)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the new use case; no HTTP/API controller, Composition Root wiring, prompt/LLM, citation generation, re-ranking, or existing hybrid retrieval use case change introduced

**Validation**
- `pnpm validate:search:hybrid`
- `pnpm validate:context:assembler`
- `pnpm validate:application:grounding-context`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 34

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define re-ranking contract

**Summary**
- Added `app/knowledge/search/RerankingInput.ts` (`{ workspaceId, query, chunks: RetrievedChunk[] }`, reusing `RetrievedChunk` from the retrieval module) and `app/knowledge/search/Reranker.ts` (`rerank(input: RerankingInput): Promise<RetrievedChunk[]>` port)
- Updated the `search` and top-level `app/knowledge` barrels to export the new types; no scoring algorithm, adapter, hybrid-search change, or application use case change implemented — contract only
- Added `runRerankerContractValidation.ts` (module-constant check, an in-file `FakeReranker` test double proving the port is implementable/callable from just the exported types and returns a `RetrievedChunk[]`-shaped result, an empty-chunk-list case, and a compile-time type-assignability check that the top-level barrel re-exports the same `Reranker` type) + `tests/unit/rerankerContract.cases.ts`
- Added `validate:search:rerank-contract` to `package.json`, wired into the top-level `validate` chain; no relevance scoring, `HybridSearch`/`RetrieveGroundingContextUseCase` change, LLM/cross-encoder provider, prompt, citation, or evaluation framework code introduced

**Validation**
- `pnpm validate:search:rerank-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 35

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic relevance reranker

**Summary**
- Extracted `DefaultKeywordSearch`'s Unicode letter/number lowercased tokenization into a shared, unexported `app/knowledge/search/tokenize.ts` utility; `DefaultKeywordSearch`'s own scoring behavior and public contract are unchanged (re-validated by `validate:search:keyword`, still green)
- Added `DefaultReranker` (`app/knowledge/search/DefaultReranker.ts`), the `Reranker` adapter, with **no constructor dependency at all**. For each candidate it computes `coverage` (fraction of the query's unique tokens present in the chunk) and `density` (fraction of the chunk's own tokens that are query-token occurrences) over the shared `tokenize` utility, both `0` when the query or chunk tokenizes to nothing; the reranked score is `coverage + density + <original retrieved score>`, sorted by that score descending then chunk `id` ascending
- Every candidate is returned (re-ranking never drops one); the input array and its `RetrievedChunk`/`DocumentChunk` objects are never mutated — the adapter returns fresh objects
- Validates `workspaceId`/`query`/`chunks` and each `RetrievedChunk`'s required identifiers (`chunk.workspaceId`/`chunk.id`/`chunk.documentId`/`chunk.text`, finite `score`) at the adapter boundary; a candidate's own `chunk.workspaceId` is validated for shape but never checked against `input.workspaceId`, since re-ranking has no data store to enforce that isolation against
- Exported `DefaultReranker` from the `search` and top-level `app/knowledge` barrels
- Added `runDefaultRerankerValidation.ts` (port contract; token-coverage ranking; equal-coverage density tie resolution; original-score contribution to ranking; exact-score chunk-id tie-break; workspaceId acceptance without candidate filtering; empty-chunks case; input/output immutability and defensive-copy checks; invalid-input rejection; static source-scan confirming no concrete-adapter import) + `tests/unit/defaultReranker.cases.ts`, wired into `validate:search:reranker` and the top-level `validate` chain
- Updated `docs/modules.md`/`docs/architecture.md`/`docs/development.md` to describe `DefaultReranker`'s scoring formula and the shared `tokenize` extraction; no LLM/cross-encoder re-ranking, external ranking service, hybrid recall change, score calibration configuration, or application use case change introduced

**Validation**
- `pnpm validate:search:keyword`
- `pnpm validate:search:rerank-contract`
- `pnpm validate:search:reranker`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 36

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add reranked hybrid search

**Summary**
- Added `RerankedSearch` port (`app/knowledge/search/RerankedSearch.ts`, `search(input: RetrievalInput): Promise<RetrievalResult>`) and its `DefaultRerankedSearch` adapter, injecting only the `HybridSearch` and `Reranker` ports — never `VectorRetriever`, `KeywordSearch`, or either port's own concrete adapter directly
- `search` validates the `RetrievalInput` once at its own boundary, calls `HybridSearch.search` with it first, then passes that result's `chunks` into `Reranker.rerank({ workspaceId, query, chunks })`; the returned `RetrievedChunk[]` becomes the adapter's own `RetrievalResult.chunks` in exactly the reranker's own order (never re-sorted a second time), with `query` set to the validated input query
- Invalid `workspaceId`/`query`/`limit` input is rejected before either dependency is called; `DefaultHybridSearch`'s RRF fusion and `DefaultReranker`'s scoring are both untouched
- Exported `RerankedSearch`/`DefaultRerankedSearch` from the `search` and top-level `app/knowledge` barrels
- Added `runDefaultRerankedSearchValidation.ts` (port contract; call-order verification via a shared log across counting `HybridSearch`/`Reranker` test doubles; exact input-field mapping to both dependencies; a reversing fake `Reranker` proving the adapter forwards the reranker's own order without re-sorting; empty-hybrid-result handling; invalid-input rejection before either dependency is called; static source-scan confirming only the two ports are imported) + `tests/unit/defaultRerankedSearch.cases.ts`, wired into `validate:search:reranked` and the top-level `validate` chain
- Updated `docs/modules.md`/`docs/architecture.md`/`docs/development.md` to describe `RerankedSearch`/`DefaultRerankedSearch`; no RRF algorithm change, context assembly change, prompt/LLM/citation code, external ranker provider, or composition wiring introduced

**Validation**
- `pnpm validate:search:hybrid`
- `pnpm validate:search:reranker`
- `pnpm validate:search:reranked`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 37

**Date**
2026-07-20

**Commit**
Pending

**Title**
Integrate reranked search into grounding context

**Summary**
- Changed `RetrieveGroundingContextUseCase`'s injected search dependency from `HybridSearch` to `RerankedSearch` — its own input contract (`workspaceId`/`query`/`retrievalLimit`/`maxCharacters`) and its delegation shape into `ContextAssembler` are unchanged
- `execute` now calls `RerankedSearch.search({ workspaceId, query, limit: retrievalLimit })` first, then passes the returned (already re-ranked) `RetrievalResult.chunks` straight into `ContextAssembler.assemble({ workspaceId, query, chunks, maxCharacters })`, returning the resulting `GroundingContext` unchanged
- Updated `runRetrieveGroundingContextUseCaseValidation.ts` and `tests/unit/retrieveGroundingContextUseCase.cases.ts`: static source-scan now requires a `RerankedSearch` import and forbids `HybridSearch`/`Reranker`/`DefaultRerankedSearch`/`DefaultHybridSearch`/`DefaultReranker` and other concrete-adapter references; the call-order/input-mapping/unchanged-result test now builds its harness from `DefaultRerankedSearch(DefaultHybridSearch, DefaultReranker)` behind a `CountingRerankedSearch` test double; the invalid-input test confirms `RerankedSearch.search` (not `HybridSearch.search`) is never called
- `RetrieveHybridKnowledgeChunksUseCase` and `RetrieveKnowledgeChunksUseCase` are unaffected; application and top-level `app/knowledge` barrel exports are unchanged (same exported names)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the `RerankedSearch` → `ContextAssembler` grounding-context flow; no HTTP/API, composition wiring, prompt/LLM/citation, or re-ranking algorithm change introduced

**Validation**
- `pnpm validate:search:reranked`
- `pnpm validate:context:assembler`
- `pnpm validate:application:grounding-context`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 38

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define grounded prompt contract

**Summary**
- Added `app/knowledge/prompt/GroundedPrompt.ts` (`{ systemInstruction, userMessage }`, both plain strings — no message-role framework or provider-specific chat format) and `app/knowledge/prompt/PromptBuilder.ts` (`build(context: GroundingContext): Promise<GroundedPrompt>` port), reusing the context module's own `GroundingContext` shape
- Updated the `prompt` and top-level `app/knowledge` barrels to export the new types; no rendering algorithm, adapter, LLM provider port, grounded answer generation, or citation generation implemented — contract only
- Added `runPromptBuilderContractValidation.ts` (module-constant check, an in-file `FakePromptBuilder` test double proving the port is implementable/callable from just the exported types and returns a `GroundedPrompt`-shaped result, an empty-`GroundingContext` case, and a compile-time type-assignability check that the top-level barrel re-exports the same `PromptBuilder` type) + `tests/unit/promptBuilderContract.cases.ts`
- Added `validate:prompt:contract` to `package.json`, wired into the top-level `validate` chain; no context assembly or re-ranking change introduced

**Validation**
- `pnpm validate:prompt:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 39

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic grounded prompt builder

**Summary**
- Added `DefaultPromptBuilder` (`app/knowledge/prompt/DefaultPromptBuilder.ts`), the `PromptBuilder` adapter, with **no constructor dependency at all** — no repository, retrieval/search/context adapter, framework, or LLM provider
- `systemInstruction` is always the fixed instruction string naming the assistant's role and its grounding-context-only constraint; `userMessage` is always the fixed format `Question:\n<query>\n\nGrounding context status: <complete|truncated>\n\nGrounding context:\n<content|[none]>`, where the status comes from `GroundingContext.truncated` and the grounding-context section is `GroundingContext.content` verbatim (`[none]` when empty) — **never re-derived from `blocks`**, so the prompt never contains evidence outside what `ContextAssembler` already assembled
- Input `GroundingContext` (and its `blocks` array/objects) are never mutated; repeated calls with the same input return byte-identical output
- Validates `query`/`content` as strings, `truncated` as a boolean, and `blocks` as an array of well-formed `GroundingContextBlock`s (non-empty `sourceId`/`documentId`/`chunkId`, finite `score`, string `text`) at the adapter boundary
- Exported `DefaultPromptBuilder` from the `prompt` and top-level `app/knowledge` barrels
- Added `runDefaultPromptBuilderValidation.ts` (port contract; fixed systemInstruction regardless of context; complete-status verbatim-content rendering; truncated-status rendering; `[none]` fallback for empty content; proof that the grounding-context section is never re-derived from `blocks`; deterministic repeated-call output; input/blocks immutability; invalid-context and malformed-block rejection; static source-scan confirming no concrete-adapter/LLM-provider/repository import) + `tests/unit/defaultPromptBuilder.cases.ts`, wired into `validate:prompt:builder` and the top-level `validate` chain
- Updated `docs/modules.md`/`docs/architecture.md`/`docs/development.md` to describe `DefaultPromptBuilder`'s LLM-independent responsibility; no LLM call, answer parsing/generation, citation object, prompt template configuration, or context assembly/re-ranking change introduced

**Validation**
- `pnpm validate:context:assembler`
- `pnpm validate:prompt:contract`
- `pnpm validate:prompt:builder`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 40

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add build grounded prompt use case

**Summary**
- Added `BuildGroundedPromptUseCase` + its own `BuildGroundedPromptInput` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`) to `application`, mirroring how `RetrieveGroundingContextInput` is kept separate from lower-level input types rather than reusing another use case's input directly
- Constructor injects only `RetrieveGroundingContextUseCase` and the `PromptBuilder` port — never `RerankedSearch`, `HybridSearch`, `ContextAssembler`, any retrieval/search/context port, or a concrete adapter; `execute` validates `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the application boundary, then calls `RetrieveGroundingContextUseCase.execute({ workspaceId, query, retrievalLimit, maxCharacters })` and passes the returned `GroundingContext` straight into `PromptBuilder.build(context)`, returning the resulting `GroundedPrompt` unchanged
- This is the first use case in this codebase to depend on another use case rather than only on ports; `RetrieveGroundingContextUseCase`'s own reranked-retrieval and context-assembly flow is unaffected
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runBuildGroundedPromptUseCaseValidation.ts` (a static source-scan confirming the use case only imports `RetrieveGroundingContextUseCase`/`PromptBuilder`; a real-harness test with a `CountingRetrieveGroundingContextUseCase` — subclassing `RetrieveGroundingContextUseCase` since its private fields make it non-structurally-typed, and overriding `execute` to delegate to a real inner instance — and a `CountingPromptBuilder`, proving `RetrieveGroundingContextUseCase.execute` is called before `PromptBuilder.build`, each dependency receives correctly-mapped input, and the returned `GroundedPrompt` matches a direct call sequence; invalid input rejected before either dependency is called) + `tests/unit/buildGroundedPromptUseCase.cases.ts`, wired into `validate:application:prompt`, `validate:application` (and therefore the top-level `validate` chain)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the new use case; no LLM Provider call, grounded answer generation, citation generation, HTTP/API, composition root wiring, or `RetrieveGroundingContextUseCase` behavior change introduced

**Validation**
- `pnpm validate:application:grounding-context`
- `pnpm validate:prompt:builder`
- `pnpm validate:application:prompt`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 41

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define language model provider contract

**Summary**
- Added `app/knowledge/ai/GeneratedText.ts` (`{ text: string }` — plain generated text, not yet a grounded answer or citation) and `app/knowledge/ai/LanguageModelProvider.ts` (`generate(prompt: GroundedPrompt): Promise<GeneratedText>` port), reusing the prompt module's own `GroundedPrompt` shape as the provider's only prompt input
- Updated the `ai` and top-level `app/knowledge` barrels to export the new types; no provider adapter, API key/network/model SDK/streaming dependency, grounded answer validation, citation, or Prompt Builder change introduced — contract only
- Added `runLanguageModelProviderContractValidation.ts` (module-constant check, an in-file `FakeLanguageModelProviderDouble` test double proving the port is implementable/callable from just the exported types and returns a `GeneratedText`-shaped result, a valid-`GroundedPrompt` case including an empty `userMessage`, and a compile-time type-assignability check that the top-level barrel re-exports the same `LanguageModelProvider` type) + `tests/unit/languageModelProviderContract.cases.ts`
- Added `validate:ai:provider-contract` to `package.json`, wired into the top-level `validate` chain; no HTTP/composition wiring introduced

**Validation**
- `pnpm validate:ai:provider-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 42

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic fake language model provider

**Summary**
- Added `FakeLanguageModelProvider` (`app/knowledge/ai/FakeLanguageModelProvider.ts`), the `LanguageModelProvider` adapter, with **no external dependency at all** — no network, API key, model SDK, repository, or retrieval/search/context/prompt-builder adapter
- `generate` validates the given `GroundedPrompt` (`systemInstruction` as a non-empty string, `userMessage` as a string) and echoes `userMessage` back as `GeneratedText.text` unchanged; it never constructs, rewrites, or re-derives a prompt of its own — prompt construction stays `PromptBuilder`'s responsibility, never the provider's
- Input `GroundedPrompt` (and its fields) are never mutated; the returned `GeneratedText` is always a fresh object; repeated calls with the same input return byte-identical output
- Exported `FakeLanguageModelProvider` from the `ai` and top-level `app/knowledge` barrels
- Added `runFakeLanguageModelProviderValidation.ts` (port contract; exact `userMessage`-to-`text` mapping; empty-`userMessage` handling; deterministic repeated-call output; input immutability + fresh-object output; invalid-prompt rejection; static source-scan confirming no real provider/model SDK/network call or lower-level adapter import) + `tests/unit/fakeLanguageModelProvider.cases.ts`, wired into `validate:ai:fake-provider` and the top-level `validate` chain
- Updated `docs/modules.md`/`docs/architecture.md`/`docs/development.md` to describe the fake provider's validation-only role and the principle that a provider must never construct prompts; no real LLM provider, streaming, token usage, model configuration, answer parsing, grounding sufficiency judgment, citation, Prompt Builder, or retrieval/context/re-ranking change introduced

**Validation**
- `pnpm validate:ai:provider-contract`
- `pnpm validate:ai:fake-provider`
- `pnpm validate:prompt:builder`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 43

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add generate grounded text use case

**Summary**
- Added `GenerateGroundedTextUseCase` + its own `GenerateGroundedTextInput` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`) to `application`, mirroring how `BuildGroundedPromptInput` is kept separate from lower-level input types rather than reusing another use case's input directly
- Constructor injects only `BuildGroundedPromptUseCase` and the `LanguageModelProvider` port — never the grounding-context retrieval use case, a prompt builder, any retrieval/search/context port, or a concrete adapter; `execute` validates `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the application boundary, then calls `BuildGroundedPromptUseCase.execute({ workspaceId, query, retrievalLimit, maxCharacters })` and passes the returned `GroundedPrompt` straight into `LanguageModelProvider.generate(prompt)`, returning the resulting `GeneratedText` unchanged
- This is the second use case in this codebase to depend on another use case rather than only on ports; `BuildGroundedPromptUseCase`'s own retrieval-then-prompt-building flow is unaffected; `GeneratedText` here is plain generated text, not yet a grounded answer or citation
- Reworded an initial doc-comment draft that named `RetrieveGroundingContextUseCase`/`PromptBuilder` directly (the static source-scan's own forbidden-reference check would otherwise fail against itself, mirroring the same class of issue fixed in Task 35's `DefaultReranker` doc comment)
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runGenerateGroundedTextUseCaseValidation.ts` (a static source-scan confirming the use case only imports `BuildGroundedPromptUseCase`/`LanguageModelProvider`; a real-harness test with a `CountingBuildGroundedPromptUseCase` — subclassing `BuildGroundedPromptUseCase` since its private fields make it non-structurally-typed, built with dummy port/use-case stubs passed to `super()` and fully overriding `execute` to delegate to a real inner instance — and a `CountingLanguageModelProvider`, proving `BuildGroundedPromptUseCase.execute` is called before `LanguageModelProvider.generate`, each dependency receives correctly-mapped input, and the returned `GeneratedText` matches a direct call sequence; invalid input rejected before either dependency is called) + `tests/unit/generateGroundedTextUseCase.cases.ts`, wired into `validate:application:generate-text`, `validate:application` (and therefore the top-level `validate` chain)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the new use case; no answer structuring, citation generation, real LLM provider, streaming, HTTP/API, composition root wiring, or `BuildGroundedPromptUseCase`/re-ranking/context-assembly behavior change introduced

**Validation**
- `pnpm validate:application:prompt`
- `pnpm validate:ai:fake-provider`
- `pnpm validate:application:generate-text`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 44

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define grounded answer assembly contract

**Summary**
- Added `app/knowledge/rag/GroundedAnswer.ts` (`{ text, evidence: GroundingContextBlock[], insufficientEvidence }`), `app/knowledge/rag/GroundedAnswerAssemblyInput.ts` (`{ context: GroundingContext, generatedText: GeneratedText }`), and `app/knowledge/rag/GroundedAnswerAssembler.ts` (`assemble(input): Promise<GroundedAnswer>` port), reusing the context and ai modules' own `GroundingContext`/`GeneratedText` shapes as-is
- This is where the insufficient-evidence policy will live — never in `PromptBuilder` (prompt construction) or `LanguageModelProvider` (generation); contract only, no policy implementation, LLM provider change, citation object, or prompt/re-ranking/context-assembly change introduced
- Updated the `rag` and top-level `app/knowledge` barrels to export the new types
- Added `runGroundedAnswerAssemblerContractValidation.ts` (module-constant check, an in-file `FakeGroundedAnswerAssembler` test double proving the port is implementable/callable from just the exported types and returns a `GroundedAnswer`-shaped result, an empty-evidence `GroundingContext` case, and a compile-time type-assignability check that the top-level barrel re-exports the same `GroundedAnswerAssembler` type) + `tests/unit/groundedAnswerAssemblerContract.cases.ts`
- Added `validate:rag:answer-contract` to `package.json`, wired into the top-level `validate` chain; no HTTP/composition wiring introduced

**Validation**
- `pnpm validate:rag:answer-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 45

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic grounded answer assembler

**Summary**
- Added `DefaultGroundedAnswerAssembler` (`app/knowledge/rag/DefaultGroundedAnswerAssembler.ts`), the `GroundedAnswerAssembler` adapter, with **no constructor dependency at all** — no framework, repository, provider, or search/context/prompt adapter
- When `context.blocks` is empty, the given `generatedText` is **discarded** and never returned as an answer: `text` is always the fixed message "The available knowledge does not contain enough information.", `evidence` is `[]`, `insufficientEvidence` is `true`
- When `context.blocks` has at least one entry, the answer is `text: generatedText.text` (unchanged), `evidence` is a fresh copy of `context.blocks`, `insufficientEvidence` is `false` — this holds even when `context.truncated` is `true`; **truncation alone is never treated as evidence absence**
- Neither the input `context`/`generatedText` nor `context.blocks` are mutated; `evidence` is always a fresh array of fresh objects
- Validates `context.query`/`content`/`truncated`/`blocks` (each block's provenance/text shape) and `generatedText.text` at the adapter boundary
- Exported `DefaultGroundedAnswerAssembler` from the `rag` and top-level `app/knowledge` barrels
- Added `runDefaultGroundedAnswerAssemblerValidation.ts` (port contract; empty-evidence short-circuit discarding generated text; evidence-present result with generated text and copied blocks; truncated-with-evidence still returns generated text; input/blocks immutability with fresh-object evidence; deterministic repeated-call output; invalid-input rejection; static source-scan confirming no concrete-adapter/provider/repository import) + `tests/unit/defaultGroundedAnswerAssembler.cases.ts`, wired into `validate:rag:answer-assembler` and the top-level `validate` chain
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the insufficient-evidence policy and answer/evidence contract; no citation formatting/identifiers, generated-text factuality evaluation, real LLM provider, streaming, model configuration, context retrieval, prompt construction, or re-ranking change introduced

**Validation**
- `pnpm validate:rag:answer-contract`
- `pnpm validate:rag:answer-assembler`
- `pnpm validate:context:assembler`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 46

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add generate grounded answer use case

**Summary**
- Added `GenerateGroundedAnswerUseCase` + its own `GenerateGroundedAnswerInput` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`) to `application`
- Constructor injects only `RetrieveGroundingContextUseCase`, `PromptBuilder`, `LanguageModelProvider`, and `GroundedAnswerAssembler` — never a concrete adapter, and never the standalone `BuildGroundedPromptUseCase`/`GenerateGroundedTextUseCase` use cases, since this use case must orchestrate the same retrieval-context/generated-text flow directly to bind the exact same context and generated text together as one answer's evidence
- `execute` validates `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the application boundary, then always calls `RetrieveGroundingContextUseCase.execute` first
- When the returned `GroundingContext.blocks` is empty, `PromptBuilder.build` and `LanguageModelProvider.generate` are **never called** — `GroundedAnswerAssembler.assemble({ context, generatedText: { text: "" } })` is called directly, so no generation happens and no generated text can be smuggled into an answer for a query with no evidence
- When `GroundingContext.blocks` has at least one entry, `PromptBuilder.build(context)` → `LanguageModelProvider.generate(prompt)` → `GroundedAnswerAssembler.assemble({ context, generatedText })` are called in that order, and the resulting `GroundedAnswer` is returned unchanged
- This is the third use case in this codebase to depend on another use case (`RetrieveGroundingContextUseCase`) rather than only on ports; the existing `BuildGroundedPromptUseCase` and `GenerateGroundedTextUseCase` are unaffected
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runGenerateGroundedAnswerUseCaseValidation.ts` (a static source-scan confirming the use case only imports its four declared dependencies and never a concrete adapter or the standalone prompt/text use cases; a real-harness test with a `CountingRetrieveGroundingContextUseCase` — subclassing `RetrieveGroundingContextUseCase` since its private fields make it non-structurally-typed, built with dummy port stubs passed to `super()` and fully overriding `execute` to delegate to a real inner instance — plus counting wrappers for `PromptBuilder`/`LanguageModelProvider`/`GroundedAnswerAssembler`, proving the evidence-present call order across all four dependencies, exact input mapping at each step, and an unchanged `GroundedAnswer` result matching a direct call sequence; a second case proving the evidence-absent short-circuit never calls the prompt builder or provider and passes an empty generated text to the assembler; invalid input rejected before any dependency is called) + `tests/unit/generateGroundedAnswerUseCase.cases.ts`, wired into `validate:application:grounded-answer`, `validate:application` (and therefore the top-level `validate` chain)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the new use case; no citation generation/display, real LLM provider, streaming, token usage, factuality scoring, evaluation dataset, HTTP/API/composition-root wiring, or existing standalone prompt/text use case behavior change introduced

**Validation**
- `pnpm validate:application:grounding-context`
- `pnpm validate:prompt:builder`
- `pnpm validate:ai:fake-provider`
- `pnpm validate:rag:answer-assembler`
- `pnpm validate:application:grounded-answer`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 47

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define citation contract

**Summary**
- Added `app/knowledge/citation/Citation.ts` (`{ id, sourceId, documentId, chunkId, score, excerpt }`), `app/knowledge/citation/CitedGroundedAnswer.ts` (`{ answer: GroundedAnswer, citations: Citation[] }`), and `app/knowledge/citation/CitationBuilder.ts` (`build(answer): Promise<Citation[]>` port), reusing the rag module's own `GroundedAnswer` shape as-is
- This is where the evidence-only citation policy will live — every citation must correspond to exactly one entry on `answer.evidence`, and an empty evidence list must produce an empty citation list; contract only, no rendering algorithm, answer-text rewriting, LLM provider change, or HTTP/composition wiring introduced
- Updated the `citation` and top-level `app/knowledge` barrels to export the new types
- Added `runCitationBuilderContractValidation.ts` (module-constant check, an in-file `FakeCitationBuilder` test double proving the port is implementable/callable from just the exported types and returns a `Citation[]`-shaped result, an empty-evidence `GroundedAnswer` case, and a compile-time type-assignability check that the top-level barrel re-exports the same `CitationBuilder` type) + `tests/unit/citationBuilderContract.cases.ts`
- Added `validate:citation:contract` to `package.json`, wired into the top-level `validate` chain

**Validation**
- `pnpm validate:citation:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 48

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic citation builder

**Summary**
- Added `DefaultCitationBuilder` (`app/knowledge/citation/DefaultCitationBuilder.ts`), the `CitationBuilder` adapter, with **no constructor dependency at all** — no framework, repository, provider, or search/context/prompt adapter
- Walks `answer.evidence` in the given order (never re-sorts) and emits exactly one `Citation` per block; `Citation.id` is `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`; `sourceId`/`documentId`/`chunkId`/`score` are copied from the block; `excerpt` is the block's own `text`, never truncated
- An empty evidence list yields an empty `Citation[]` — **never a fabricated citation**
- Neither the input answer nor its evidence array/entries are mutated; every returned citation is a fresh object
- Validates `answer.text`/`insufficientEvidence`/`evidence` (each block's provenance/text/score shape) at the adapter boundary
- Exported `DefaultCitationBuilder` from the `citation` and top-level `app/knowledge` barrels
- Added `runDefaultCitationBuilderValidation.ts` (port contract; one-citation-per-evidence with deterministic id including URI-encoded special characters; empty-evidence empty-citations; order preservation; input/evidence immutability with fresh-object citations; invalid-answer rejection; static source-scan confirming no concrete-adapter/provider/repository import) + `tests/unit/defaultCitationBuilder.cases.ts`, wired into `validate:citation:builder` and the top-level `validate` chain
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the evidence-only citation policy; no citation numbering in answer text, document-title lookup, LLM citation extraction, grounded-answer policy change, or HTTP/composition wiring introduced

**Validation**
- `pnpm validate:citation:contract`
- `pnpm validate:citation:builder`
- `pnpm validate:rag:answer-assembler`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 49

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add generate cited grounded answer use case

**Summary**
- Added `GenerateCitedGroundedAnswerUseCase` + its own `GenerateCitedGroundedAnswerInput` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`) to `application`
- Constructor injects only `GenerateGroundedAnswerUseCase` and the `CitationBuilder` port — never a concrete adapter, and never the lower-level retrieval/prompt/provider/assembler ports those dependencies already own
- `execute` validates `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` at the application boundary, then calls `GenerateGroundedAnswerUseCase.execute` and passes the returned `GroundedAnswer` straight into `CitationBuilder.build`, returning `{ answer, citations }` as a `CitedGroundedAnswer` unchanged
- The citation builder is **always** called — including for an insufficient-evidence answer — so an empty-evidence answer yields an empty citation list via the citation module's own evidence-only policy
- The existing `GenerateGroundedAnswerUseCase` behavior is unaffected
- Exported the use case + input type from the `application` and top-level `app/knowledge` barrels
- Added `runGenerateCitedGroundedAnswerUseCaseValidation.ts` (a static source-scan confirming the use case only imports its two declared dependencies; a real-harness test with a `CountingGenerateGroundedAnswerUseCase` — subclassing `GenerateGroundedAnswerUseCase` since its private fields make it non-structurally-typed — plus a `CountingCitationBuilder`, proving call order, exact input mapping, answer-to-citation mapping, and an unchanged `CitedGroundedAnswer` result matching a direct call sequence; a second case proving the insufficient-evidence path still calls the citation builder and returns empty citations; invalid input rejected before either dependency is called) + `tests/unit/generateCitedGroundedAnswerUseCase.cases.ts`, wired into `validate:application:cited-answer`, `validate:application` (and therefore the top-level `validate` chain)
- Updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md` to describe the new use case; no citation marker injection, real LLM provider, streaming, HTTP/API, MCP, composition-root wiring, or evaluation dataset introduced

**Validation**
- `pnpm validate:application:grounded-answer`
- `pnpm validate:citation:builder`
- `pnpm validate:application:cited-answer`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 50

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define MCP tool contract and module boundary

**Summary**
- Added `app/knowledge/mcp` module with `KNOWLEDGE_MODULE_MCP = "app/knowledge/mcp"`
- Added `McpToolName` (`"generate_cited_grounded_answer"`), `McpToolDefinition` (`name`, `description`, `inputKeys: readonly string[]`), `McpToolInvokeInput` (`name: McpToolName`, `arguments: Record<string, unknown>`), `McpToolInvokeResult` (`ok`, `toolName: McpToolName`, optional `result: CitedGroundedAnswer` / `error`), and the `McpTool` port (`definition` + `invoke(args): Promise<McpToolInvokeResult>`)
- Registered `KNOWLEDGE_MODULE_MCP` in `scripts/validate-skeleton.ts` `REQUIRED_MODULES` and exported contract types from the `mcp` and top-level `app/knowledge` barrels
- Added `runMcpToolContractValidation.ts` (module-constant check, in-file `FakeMcpTool` proving port implementability/callable success and ok=false error shape, top-level barrel type-assignability) + `tests/unit/mcpToolContract.cases.ts`
- Added `validate:mcp:contract` to `package.json`, wired into the top-level `validate` chain; updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md`
- Contract only — no tool adapter, real MCP SDK, network transport, JSON-RPC server, registry, or composition wiring introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:mcp:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 51

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add cited grounded answer MCP tool

**Summary**
- Added `GenerateCitedGroundedAnswerMcpTool` (`app/knowledge/mcp`), implementing `McpTool` with only `GenerateCitedGroundedAnswerUseCase` injected
- Fixed `definition`: `name` = `"generate_cited_grounded_answer"`, `description` = `"Generate a workspace-scoped grounded answer with evidence-bound citations."`, `inputKeys` = `["workspaceId", "query", "retrievalLimit", "maxCharacters"]`
- `invoke` validates the four keys with the same rules as the use case's application input; valid → `{ ok: true, toolName, result }`; invalid → `{ ok: false, toolName, error }` without calling the use case; use-case throw → `{ ok: false, toolName, error: <message> }` — never throws across this boundary for those cases
- Exported from `mcp` and top-level barrels; added `runGenerateCitedGroundedAnswerMcpToolValidation.ts` + unit case inventory; wired `validate:mcp:cited-answer-tool`
- Updated docs; no additional tools, registry, real MCP transport/SDK, answer/citation policy change, or composition wiring introduced

**Validation**
- `pnpm validate:application:cited-answer`
- `pnpm validate:mcp:contract`
- `pnpm validate:mcp:cited-answer-tool`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 52

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add MCP tool registry

**Summary**
- Added `McpToolRegistry` port (`listTools`, `invoke`) and `DefaultMcpToolRegistry` (constructor takes `readonly McpTool[]`, rejects duplicate names, lists definitions name-ascending, delegates known invokes, returns `{ ok: false, toolName: <requested>, error: "Unknown MCP tool: <name>" }` for unknown names)
- Widened `McpToolInvokeInput.name` and `McpToolInvokeResult.toolName` from `McpToolName` to `string` so unknown names can be echoed without normalizing
- Exported from `mcp` and top-level barrels; added `runDefaultMcpToolRegistryValidation.ts` + unit case inventory; wired `validate:mcp:registry`
- Updated docs; no real MCP host/SDK, auth beyond existing workspace validation, multi-tool workflows, or composition wiring introduced

**Validation**
- `pnpm validate:mcp:cited-answer-tool`
- `pnpm validate:mcp:registry`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 53

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add invoke MCP tool use case

**Summary**
- Added `InvokeMcpToolUseCase` + `InvokeMcpToolInput` (`name: string`, `arguments: Record<string, unknown>`) to `application`
- Constructor injects only the `McpToolRegistry` port; `execute` validates input at the application boundary, delegates to `McpToolRegistry.invoke({ name, arguments })`, and returns the `McpToolInvokeResult` unchanged
- Exported from `application` and top-level barrels; added `runInvokeMcpToolUseCaseValidation.ts` + unit case inventory; wired `validate:application:mcp-invoke` into `validate:application` and top-level `validate`
- Updated docs; no real MCP transport, Agent planner/executor, multi-tool orchestration, HTTP/API/composition wiring, or auth middleware introduced

**Validation**
- `pnpm validate:mcp:registry`
- `pnpm validate:application:mcp-invoke`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 54

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define tool calling contract and module boundary

**Summary**
- Added `app/knowledge/tools` module with `KNOWLEDGE_MODULE_TOOLS = "app/knowledge/tools"`
- Added `ToolCallStatus` (`"success" | "invalid_request" | "unknown_tool" | "timeout" | "failure"`), `ToolCallRequest` (`name`, `arguments`, `timeoutMs`), `ToolCallResult` (`ok`, `status`, `toolName`, optional `result`/`error`, `durationMs`), and the `ToolExecutor` port (`execute(request): Promise<ToolCallResult>`)
- Registered `KNOWLEDGE_MODULE_TOOLS` in `scripts/validate-skeleton.ts` `REQUIRED_MODULES` immediately after `KNOWLEDGE_MODULE_MCP`; exported contract types from the `tools` and top-level `app/knowledge` barrels
- Added `runToolCallingContractValidation.ts` (module-constant check, in-file `FakeToolExecutor` proving port implementability and success/error result shapes, top-level barrel type-assignability) + `tests/unit/toolCallingContract.cases.ts`
- Added `validate:tools:contract` to `package.json`, wired into the top-level `validate` chain; updated `docs/architecture.md`/`docs/modules.md`/`docs/development.md`
- Contract only — no executor adapter, timeout/retry, Agent orchestrator, real MCP SDK/transport, composition wiring, or `reliability` feature implementation introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:tools:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 55

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add default tool executor

**Summary**
- Added `DefaultToolExecutor` (`app/knowledge/tools`), implementing `ToolExecutor` with only `McpToolRegistry` injected
- Validates `name`/`arguments`/`timeoutMs`; invalid → `{ ok: false, status: "invalid_request", ... }` without calling the registry
- Maps MCP `ok: true` → `success`; `"Unknown MCP tool: "` prefix → `unknown_tool`; other `ok: false` / registry throws → `failure`; always returns non-negative `durationMs`; never throws for those cases
- `timeoutMs` is validated but not yet enforced as a race (Task 56)
- Exported from `tools` and top-level barrels; added `runDefaultToolExecutorValidation.ts` + unit case inventory; wired `validate:tools:executor`
- Updated docs; no timeout enforcement, retry/backoff, Agent orchestration, multi-tool workflows, composition wiring, or answer/citation/MCP tool policy changes introduced

**Validation**
- `pnpm validate:mcp:registry`
- `pnpm validate:tools:contract`
- `pnpm validate:tools:executor`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 56

**Date**
2026-07-20

**Commit**
Pending

**Title**
Enforce tool call timeout boundary

**Summary**
- Updated `DefaultToolExecutor.execute` to race registry invoke against `timeoutMs` (dependency-free `setTimeout` + `Promise.race`)
- When timeout wins: returns `{ ok: false, status: "timeout", toolName: <requested>, error: "Tool call timed out after <timeoutMs>ms", durationMs }` without throwing, ignoring a later registry result
- When registry wins first: existing success/unknown_tool/failure mapping is unchanged
- Extended `runDefaultToolExecutorValidation.ts` with a never-resolving fake + short timeout path, and a fast-resolving success under a generous timeout proving success is not contaminated
- Updated docs; no retry/backoff/circuit breaker, cancel-token API, Agent-level deadline aggregation, `reliability` module implementation, or composition wiring introduced

**Validation**
- `pnpm validate:tools:contract`
- `pnpm validate:tools:executor`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 57

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add execute tool call use case

**Summary**
- Added `ExecuteToolCallUseCase` + `ExecuteToolCallInput` (`name`, `arguments`, `timeoutMs`) to `application`
- Constructor injects only the `ToolExecutor` port; `execute` validates input at the application boundary (throws on invalid input without calling the executor), delegates to `ToolExecutor.execute({ name, arguments, timeoutMs })`, and returns the `ToolCallResult` unchanged
- Existing `InvokeMcpToolUseCase` retained and unchanged
- Exported from `application` and top-level barrels; added `runExecuteToolCallUseCaseValidation.ts` + unit case inventory; wired `validate:application:tool-call` into `validate:application` and top-level `validate`
- Updated docs; no Agent planner/executor, multi-step orchestration, retry policy, real MCP transport, HTTP/API/composition wiring introduced

**Validation**
- `pnpm validate:tools:executor`
- `pnpm validate:application:tool-call`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 58

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define agent contract and module boundary

**Summary**
- Added `app/knowledge/agent` module with `KNOWLEDGE_MODULE_AGENT`, role/plan/run types (`AgentRole`, `AgentGoal`, `AgentPlanStep`, `AgentPlan`, `AgentStepResult`, `AgentReviewDecision`, `AgentReviewResult`, `AgentExecutionStatus`, `AgentRunResult`), and ports (`AgentPlanner`, `AgentStepExecutor`, `AgentReviewer`, `AgentOrchestrator`)
- Registered the module in skeleton `REQUIRED_MODULES` (after `tools`); re-exported from top-level barrel; updated `docs/modules.md`, `docs/architecture.md`, `docs/development.md`
- Added `runAgentContractValidation.ts` + `tests/unit/agentContract.cases.ts`; wired `validate:agent:contract` into top-level `validate`
- No planner/executor/reviewer/orchestrator adapters, Memory, LLM planning, multi-agent, or composition-root wiring introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:agent:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 59

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic knowledge agent planner

**Summary**
- Added `DeterministicKnowledgeAgentPlanner` implementing `AgentPlanner` with no constructor dependencies
- `plan` validates `AgentGoal` (non-empty `workspaceId`/`query`; positive integer `retrievalLimit`/`maxCharacters`/`toolTimeoutMs`) and always returns a single step (`id: "step-1"`, `toolName: "generate_cited_grounded_answer"`, arguments `{ workspaceId, query, retrievalLimit, maxCharacters }`) with a copied validated goal; identical inputs yield byte-identical JSON plans
- Exported from agent and top-level barrels; added `runDeterministicKnowledgeAgentPlannerValidation.ts` + unit case inventory; wired `validate:agent:planner` into top-level `validate`
- Updated docs; no ToolExecutor/LLM/repository dependency, multi-step planning, reviewer, or orchestrator introduced

**Validation**
- `pnpm validate:agent:contract`
- `pnpm validate:agent:planner`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 60

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add agent step executor and reviewer

**Summary**
- Added `DefaultAgentStepExecutor` implementing `AgentStepExecutor` with only a `ToolExecutor` port dependency; validates step/`timeoutMs`, delegates to `ToolExecutor.execute({ name, arguments, timeoutMs })`, returns `{ stepId, toolCall }` unchanged
- Added `DefaultAgentReviewer` implementing `AgentReviewer` with no constructor dependencies; mismatch → rejected; any non-success tool call status → rejected with status reason; all success → approved; never reinterprets answer text
- Exported from agent and top-level barrels; added step-executor and reviewer validation runners + unit case inventories; wired `validate:agent:step-executor` and `validate:agent:reviewer` into top-level `validate`
- Updated docs; no orchestrator, application use case, retry, or Memory introduced

**Validation**
- `pnpm validate:tools:executor`
- `pnpm validate:agent:planner`
- `pnpm validate:agent:step-executor`
- `pnpm validate:agent:reviewer`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 61

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add agent orchestrator and run use case

**Summary**
- Added `DefaultAgentOrchestrator` implementing `AgentOrchestrator` with only planner/stepExecutor/reviewer port dependencies; runs plan→execute→review; maps approved→completed, rejected+non-success→failed, rejected+all-success→rejected; on step throw records failure ToolCallResult (`durationMs: 0`), stops remaining steps, still reviews
- Added `RunAgentUseCase` + `RunAgentInput` (AgentGoal-shaped fields) to application; injects only `AgentOrchestrator`; validates at application boundary then returns `AgentRunResult` unchanged; existing `ExecuteToolCallUseCase` / `InvokeMcpToolUseCase` retained
- Exported from agent/application/top-level barrels; added orchestrator and run-agent validation runners + unit case inventories; wired `validate:agent:orchestrator` and `validate:application:run-agent` into `validate:application` / top-level `validate`
- Updated docs; no Memory, LLM replanning, multi-agent expansion, background jobs, or composition-root wiring introduced

**Validation**
- `pnpm validate:agent:step-executor`
- `pnpm validate:agent:reviewer`
- `pnpm validate:agent:orchestrator`
- `pnpm validate:application:run-agent`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 62

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define memory contract and module boundary

**Summary**
- Added `app/knowledge/memory` module with `KNOWLEDGE_MODULE_MEMORY`, `MemoryEntryRole`, `MemoryEntry`, and `MemoryStore` port (`append` / `listBySession`)
- Module docs state Memory does not replace Knowledge document/chunk/vector search
- Registered in skeleton `REQUIRED_MODULES` after `agent`; re-exported from top-level barrel; updated docs
- Added `runMemoryContractValidation.ts` + unit case inventory; wired `validate:memory:contract` into top-level `validate`
- No in-memory adapter, application use case, Agent orchestrator change, or composition wiring introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:memory:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 63

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add in-memory memory store

**Summary**
- Added `InMemoryMemoryStore` implementing `MemoryStore` with validated append (`workspaceId`/`sessionId`/`content` non-empty; `role` in user|agent|system)
- Successful append stores entry with 1-based per-session `sequence` and deterministic `id` = `${workspaceId}:${sessionId}:${sequence}`; `listBySession` returns sequence-ascending defensive copies; empty session → `[]`; same sessionId isolated across workspaces
- Exported from memory and top-level barrels; added `runInMemoryMemoryStoreValidation.ts` + unit case inventory; wired `validate:memory:store` into top-level `validate`
- Updated docs; no application use case, Agent integration, TTL, or DB persistence introduced

**Validation**
- `pnpm validate:memory:contract`
- `pnpm validate:memory:store`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 64

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add append and recall memory use cases

**Summary**
- Added `AppendMemoryEntryUseCase` + `AppendMemoryEntryInput` injecting only `MemoryStore`; validates then delegates to `append` and returns `MemoryEntry` unchanged
- Added `RecallMemoryEntriesUseCase` + `RecallMemoryEntriesInput` (`limit?`); validates then lists session; without limit returns all; with limit returns newest N entries still sequence-ascending
- Exported from application and top-level barrels; added validation runners + unit case inventories; wired into `validate:application` and top-level `validate`
- Updated docs; no Agent orchestrator change, Memory-aware planner, or composition wiring introduced

**Validation**
- `pnpm validate:memory:store`
- `pnpm validate:application:memory-append`
- `pnpm validate:application:memory-recall`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 65

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add run agent with memory use case

**Summary**
- Added `RunAgentWithMemoryUseCase` + `RunAgentWithMemoryInput`/`RunAgentWithMemoryResult` injecting only `MemoryStore` and `AgentOrchestrator`
- `execute` validates input, recalls session entries, appends user query, runs AgentOrchestrator with AgentGoal fields, appends fixed agent summary (`status=...; decision=...; reason=...`), returns `{ recalled, run, written }`
- Existing `RunAgentUseCase` and Agent role adapters unchanged; memory not injected into planner
- Exported from application/top-level barrels; added validation runner + unit case inventory; wired `validate:application:run-agent-memory` into `validate:application` / top-level `validate`
- Updated docs; no composition wiring, Memory-as-Knowledge, or multi-session summarization introduced

**Validation**
- `pnpm validate:application:run-agent`
- `pnpm validate:application:memory-append`
- `pnpm validate:application:memory-recall`
- `pnpm validate:application:run-agent-memory`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 66

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define job contract and module boundary

**Summary**
- Added `app/knowledge/jobs` module with `KNOWLEDGE_MODULE_JOBS`, `JobType`, `JobStatus`, `JobRecord`, and ports (`JobStore`, `JobHandler`, `JobProcessor`)
- Registered in skeleton `REQUIRED_MODULES` after `memory`; re-exported from top-level barrel; updated docs
- Added `runJobContractValidation.ts` + unit case inventory; wired `validate:jobs:contract` into top-level `validate`
- No in-memory store/processor/handler, real worker, reliability features, or composition wiring introduced

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:jobs:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 67

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add in-memory job store

**Summary**
- Added `InMemoryJobStore` implementing `JobStore` with validated enqueue, deterministic `id`/`sequence`, pending status, getById, sequence-ascending listByWorkspace, save-replace (unknown id throws), workspace isolation, and defensive copies
- Exported from jobs and top-level barrels; added `runInMemoryJobStoreValidation.ts` + unit case inventory; wired `validate:jobs:store` into top-level `validate`
- Updated docs; no processor/handler, retry execution, or application use case introduced

**Validation**
- `pnpm validate:jobs:contract`
- `pnpm validate:jobs:store`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 68

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add job processor and sync job handler

**Summary**
- Added `SyncKnowledgeSourceJobHandler` (`type=sync_knowledge_source`) injecting only `SyncKnowledgeSourcePipeline`; returns `{ sourceId, fetchedCount, savedCount }`
- Added `DefaultJobProcessor` injecting `JobStore` + handlers; rejects duplicate types; processes oldest pending job with running/completed/failed/retry transitions; missing handler → failed with typed error
- Exported from jobs/top-level barrels; added sync-handler and processor validation runners + unit case inventories; wired into top-level `validate`
- Updated docs; no reindex handler, application use case, or real worker introduced

**Validation**
- `pnpm validate:pipeline:sync`
- `pnpm validate:jobs:store`
- `pnpm validate:jobs:sync-handler`
- `pnpm validate:jobs:processor`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 69

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add reindex job handler and job application use cases

**Summary**
- Added `ReindexKnowledgeSourceJobHandler` (`type=reindex_knowledge_source`) injecting only rechunk + reindex pipelines; maps counts; rechunk failure skips reindex
- Added `EnqueueJobUseCase` (JobStore only) and `ProcessNextJobUseCase` (JobProcessor only)
- Exported from jobs/application/top-level barrels; added validation runners + unit case inventories; wired into `validate:application` / top-level `validate`
- Updated docs; no real worker/cron, composition wiring, or pipeline behavior changes introduced

**Validation**
- `pnpm validate:pipeline:rechunk-source`
- `pnpm validate:pipeline:reindex-source`
- `pnpm validate:jobs:processor`
- `pnpm validate:jobs:reindex-handler`
- `pnpm validate:application:enqueue-job`
- `pnpm validate:application:process-next-job`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 70

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define sync change-set and lifecycle contract

**Summary**
- Added pipeline sync hardening contracts: `SyncChangeKind`, `SyncDocumentChange`, `SyncChangeSet`, `SyncLifecycleStatus`, `SyncLifecycleResult`
- Added `KnowledgeSourceChangeDetector` and `KnowledgeSourceReconciler` ports (no adapters)
- Exported from pipeline and top-level barrels; updated docs
- Added `runSyncChangeContractValidation.ts` + unit case inventory; wired `validate:pipeline:sync-change-contract` into top-level `validate`
- Existing `SyncKnowledgeSourcePipeline` / connector / job handlers unchanged

**Validation**
- `pnpm validate:pipeline:connector`
- `pnpm validate:pipeline:sync`
- `pnpm validate:pipeline:sync-change-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 71

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deterministic knowledge source change detector

**Summary**
- Added `DefaultKnowledgeSourceChangeDetector` (no constructor deps): validates input, same canonical id formula as sync pipeline, classifies added/updated/unchanged/removed, deterministic kind+documentId ordering, ignores other-source existing docs, rejects duplicate externalId
- Exported from pipeline/top-level barrels; updated docs
- Added `runDefaultKnowledgeSourceChangeDetectorValidation.ts` + unit case inventory; wired `validate:pipeline:change-detector` into top-level `validate`
- No persistence, reconciler, or sync pipeline changes

**Validation**
- `pnpm validate:pipeline:sync-change-contract`
- `pnpm validate:pipeline:change-detector`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 72

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add vector delete and knowledge source reconciler

**Summary**
- Added `VectorIndex.deleteByChunkId` (missing = no-op) and implemented it on `InMemoryVectorIndex`; extended embedding index validation
- Added `DefaultKnowledgeSourceReconciler` (document/chunk/vector ports only): ordered cleanup, missing skip, source mismatch stop
- Exported from barrels; updated docs; wired `validate:pipeline:reconciler` into top-level `validate`
- No reconciling sync orchestration or job handler changes

**Validation**
- `pnpm validate:embedding:index`
- `pnpm validate:repository:chunk`
- `pnpm validate:pipeline:change-detector`
- `pnpm validate:pipeline:reconciler`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 73

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add reconciling sync pipeline and wire sync job handler

**Summary**
- Added `ReconcilingSyncKnowledgeSourcePipeline` (detect → upsert added/updated → reconcile removed); legacy `SyncKnowledgeSourcePipeline` unchanged
- Wired `SyncKnowledgeSourceJobHandler` to reconciling pipeline with lifecycle summary result shape
- Added reconciling-sync validation; updated sync-handler/processor validations; wired `validate:pipeline:reconciling-sync` into top-level `validate`
- Updated barrels/docs

**Validation**
- `pnpm validate:pipeline:sync`
- `pnpm validate:pipeline:change-detector`
- `pnpm validate:pipeline:reconciler`
- `pnpm validate:pipeline:reconciling-sync`
- `pnpm validate:jobs:sync-handler`
- `pnpm validate:jobs:processor`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 74

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define evaluation dataset and metrics contract

**Summary**
- Added evaluation contracts: `EvaluationCase`/`EvaluationDataset`, retrieval/grounding/citation case scores and metrics, `EvaluationReport`
- Added `RetrievalEvaluator`/`GroundingEvaluator`/`CitationEvaluator` ports (no adapters)
- Updated evaluation module barrel comment; re-exported from top-level; updated docs
- Added `runEvaluationContractValidation.ts` + unit case inventory; wired `validate:evaluation:contract` into top-level `validate`
- No evaluator adapters, use cases, corpus loaders, or composition wiring

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:evaluation:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 75

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add retrieval evaluator and run use case

**Summary**
- Added `DefaultRetrievalEvaluator` (Hit@K / MRR; empty dataset and missing results rejected)
- Added `RunRetrievalEvaluationUseCase` (RetrieveHybridKnowledgeChunksUseCase + RetrievalEvaluator only)
- Exported from barrels; wired `validate:evaluation:retrieval` and `validate:application:eval-retrieval`
- Updated docs; no grounding/citation evaluators or composition wiring

**Validation**
- `pnpm validate:evaluation:contract`
- `pnpm validate:application:retrieve-hybrid`
- `pnpm validate:evaluation:retrieval`
- `pnpm validate:application:eval-retrieval`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 76

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add grounding evaluator and run use case

**Summary**
- Added `DefaultGroundingEvaluator` (insufficient-evidence compliance; only `expectInsufficientEvidence=true` cases)
- Added `RunGroundingEvaluationUseCase` (GenerateGroundedAnswerUseCase + GroundingEvaluator only)
- Wired `validate:evaluation:grounding` and `validate:application:eval-grounding`; updated barrels/docs
- No citation evaluator or composition wiring

**Validation**
- `pnpm validate:application:grounded-answer`
- `pnpm validate:evaluation:grounding`
- `pnpm validate:application:eval-grounding`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 77

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add citation evaluator and run use case

**Summary**
- Added `DefaultCitationEvaluator` (evidence-bound citation correctness; empty dataset rejected)
- Added `RunCitationEvaluationUseCase` (GenerateCitedGroundedAnswerUseCase + CitationEvaluator only)
- Wired `validate:evaluation:citation` and `validate:application:eval-citation`; updated barrels/docs
- No combined report use case, corpus loader, or composition wiring

**Validation**
- `pnpm validate:application:cited-answer`
- `pnpm validate:evaluation:citation`
- `pnpm validate:application:eval-citation`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 78

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define runtime configuration contract and loader

**Summary**
- Added `KnowledgeRuntimeConfig`, `DEFAULT_KNOWLEDGE_RUNTIME_CONFIG`, and `loadKnowledgeRuntimeConfig` (plain-object validation + defensive copy; no process.env)
- Updated config module barrel and top-level exports; updated docs
- Added `runKnowledgeRuntimeConfigValidation.ts` + unit case inventory; wired `validate:config:runtime`
- No composition, HTTP/API/server, or env adapter

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:config:runtime`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 79

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add in-memory knowledge composition root

**Summary**
- Added `KnowledgeRuntime`, `InMemoryKnowledgeComposition`, and `createInMemoryKnowledgeComposition` wiring cited-answer use-case chain with in-memory/fake adapters
- Runtime fills missing retrievalLimit/maxCharacters from config defaults
- Added validation + `validate:composition:in-memory`; updated barrels/docs
- No HTTP/API/server, agent/memory/jobs/mcp full wiring, or real providers

**Validation**
- `pnpm validate:config:runtime`
- `pnpm validate:application:cited-answer`
- `pnpm validate:composition:in-memory`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 80

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add HTTP abstraction and cited-answer API controller

**Summary**
- Added framework-independent HTTP types, ports, and `DefaultHttpRouter` (exact method+path; JSON 404)
- Added `HealthController`, `CitedGroundedAnswerController` (KnowledgeRuntime-only), and `createKnowledgeHttpRouter`
- Added validators + `validate:http:router` / `validate:api:cited-answer`; updated barrels/docs
- No Express/Fastify/node:http listen, auth, or OpenAPI

**Validation**
- `pnpm validate:composition:in-memory`
- `pnpm validate:http:router`
- `pnpm validate:api:cited-answer`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 81

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add server lifecycle and request dispatch

**Summary**
- Added `KnowledgeServer` port and `DefaultKnowledgeServer` (start/stop/dispatch; HttpRouter-only; no TCP)
- Added `createInMemoryKnowledgeServer` in composition wiring composition → router → server
- Added validation + `validate:server:lifecycle`; updated barrels/docs
- No node:http/Express listen, Docker entrypoint, or Operations middleware

**Validation**
- `pnpm validate:api:cited-answer`
- `pnpm validate:composition:in-memory`
- `pnpm validate:server:lifecycle`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 82

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define observability logger and metrics

**Summary**
- Added `LogLevel`/`LogEvent`/`Logger` and `MetricPoint`/`Metrics` ports
- Added `InMemoryLogger` (ordered events, defensive copies, clear) and `InMemoryMetrics` (signature accumulation, sorted getPoints)
- Added `validate:observability:contract`; updated barrels/docs
- No HTTP middleware wiring, reliability/security, or real exporters

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:observability:contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 83

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add reliability retry and timeout policies

**Summary**
- Added `RetryDecision`/`RetryPolicy`/`DefaultRetryPolicy` (no-delay, positive maxAttempts)
- Added `TimeoutPolicy`/`DefaultTimeoutPolicy` (Promise.race + setTimeout; clear on success)
- Added `validate:reliability:retry` and `validate:reliability:timeout`; updated barrels/docs
- Did not modify ToolExecutor/JobProcessor or add circuit breaker/wiring

**Validation**
- `pnpm validate:reliability:retry`
- `pnpm validate:reliability:timeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 84

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add workspace authorization and HTTP security guard

**Summary**
- Added `WorkspaceAuthorizer`/`DefaultWorkspaceAuthorizer` and `HttpWorkspaceGuard` (`x-workspace-id`)
- Updated `CitedGroundedAnswerController` + `createKnowledgeHttpRouter(runtime, guard)`; guard failures map to 403
- Health remains unauthenticated; updated API/server validators for header requirements
- Added `validate:security:workspace` and `validate:security:http-guard`

**Validation**
- `pnpm validate:security:workspace`
- `pnpm validate:security:http-guard`
- `pnpm validate:api:cited-answer`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 85

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add deployment readiness validation and operations wiring

**Summary**
- Added `ObservingHttpRouter` (start/finish/error logs + `http.requests` metrics)
- Added `createOperationsKnowledgeServer` (composition + guard + observing router + server)
- Added `scripts/validate-deployment-readiness.ts` (Docker daemon-free static checks)
- Added `validate:http:observing`, `validate:composition:operations`, `validate:deployment:readiness`; updated deployment docs

**Validation**
- `pnpm validate:observability:contract`
- `pnpm validate:security:http-guard`
- `pnpm validate:server:lifecycle`
- `pnpm validate:deployment:readiness`
- `pnpm validate:composition:operations`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 86

**Date**
2026-07-20

**Commit**
Pending

**Title**
Update portfolio for Project 2 completion

**Summary**
- Rewrote `docs/portfolio.md` from Task 1 skeleton narrative to Project 2 completed platform
- Listed Charter capabilities in order (Workspace through Operations)
- Documented dependency-free validation + intentional non-goals; removed "skeleton only" Project1 framing
- No code/module behavior changes

**Validation**
- `pnpm validate:skeleton`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 87

**Date**
2026-07-20

**Commit**
Pending

**Title**
Document architecture limits and roadmap completion

**Summary**
- Added Project 2 Completion Boundary to `docs/architecture.md` (completed capabilities, composition-only wiring, deferred infra)
- Aligned `docs/modules.md` (composition/operations, infra deferred; removed stale skeleton-only claim)
- Marked operations-ready server + `validate:deployment:readiness` as Project 2 closeout criteria in `docs/deployment.md`
- Added `docs/progress/PROJECT02_ROADMAP_STATUS.md` (Completed / Deferred / Task 1–85 + Sprint 20)

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:deployment:readiness`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 88

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add project closeout validation runner

**Summary**
- Added `scripts/validate-project-closeout.ts` (docs, portfolio keywords, roadmap Completed/Deferred, scripts, barrel exports, Task 85 progress marker)
- Wired `validate:project:closeout` into top-level `validate` (before typecheck)
- Documented closeout validator in `docs/development.md`
- No business logic or container build changes

**Validation**
- `pnpm validate:deployment:readiness`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 89

**Date**
2026-07-20

**Commit**
Pending

**Title**
Finalize README and Progress Log closeout entry

**Summary**
- Updated `README.md` for Project 2 Platform Baseline completion, validate/closeout commands, in-memory runtime entry, deferred infra
- Documented Sprint/Task validation flow and closeout command in `docs/development.md`
- Project 2 Platform Baseline closeout completed (Sprint 20 / Tasks 86–89)
- No product code or ops-docs commits

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:skeleton`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 90

**Date**
2026-07-20

**Commit**
Pending

**Title**
Define SQL gateway contract and infra boundary

**Summary**
- Added `SqlParameter`, `SqlQueryResult`, and `SqlGateway` port in `infra`
- Updated infra module docs from skeleton deferred to SoT SQL gateway boundary
- Added `validate:infra:sql-gateway-contract`; noted Sprint 21 post-baseline persistence in architecture
- No repository adapter, real Postgres driver, or composition wiring

**Validation**
- `pnpm validate:skeleton`
- `pnpm validate:infra:sql-gateway-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 91

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add SQL-backed knowledge document repository

**Summary**
- Added `SqlKnowledgeDocumentRepository` implementing `KnowledgeDocumentRepository` via `SqlGateway` only
- Documented/parameterized SQL for `knowledge_documents` upsert/select/delete (bound params only)
- Shared SQL statement constants under `infra/knowledgeDocumentSql.ts`
- No real Postgres connection, source/chunk SQL adapters, or composition wiring

**Validation**
- `pnpm validate:repository`
- `pnpm validate:infra:sql-gateway-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 92

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add in-memory SQL gateway and repository validation

**Summary**
- Added `InMemorySqlGateway` supporting knowledge_documents upsert/select/delete SQL
- Added `validate:infra:in-memory-sql` and `validate:repository:sql-document` mirroring in-memory repository contracts
- No real Postgres / ORM / Docker daemon usage

**Validation**
- `pnpm validate:repository`
- `pnpm validate:infra:in-memory-sql`
- `pnpm validate:repository:sql-document`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 93

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add SQL-backed composition path and update roadmap status

**Summary**
- Added `createSqlDocumentKnowledgeComposition` / `SqlDocumentKnowledgeComposition` (SQL documents + in-memory/fake cited-answer stack)
- Wired `validate:composition:sql-document`
- Updated roadmap status (Postgres partial; Sprint 21 range) and architecture Completion Boundary
- Default in-memory/operations composition paths unchanged; no real `pg` driver

**Validation**
- `pnpm validate:repository:sql-document`
- `pnpm validate:composition:in-memory`
- `pnpm validate:composition:sql-document`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 94

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add SQL-backed knowledge source repository

**Summary**
- Added `infra/knowledgeSourceSql.ts` parameterized SQL for `knowledge_sources`
- Added `SqlKnowledgeSourceRepository` implementing `KnowledgeSourceRepository` via `SqlGateway` only
- Updated barrels/docs; no InMemorySqlGateway source support, chunk SQL, or composition wiring yet

**Validation**
- `pnpm validate:repository:source`
- `pnpm validate:repository:sql-document`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 95

**Date**
2026-07-20

**Commit**
Pending

**Title**
Add SQL-backed document chunk repository

**Summary**
- Added `infra/documentChunkSql.ts` parameterized SQL for `document_chunks`
- Added `SqlDocumentChunkRepository` with replaceForDocument conflict pre-check + delete-then-insert
- Matches in-memory chunk port ordering and workspace-global id rules
- InMemorySqlGateway chunk support deferred to Task 96

**Validation**
- `pnpm validate:repository:chunk`
- `pnpm validate:repository:sql-document`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 96

**Date**
2026-07-20

**Commit**
450f4bd

**Title**
Extend InMemorySqlGateway for source and chunk SQL

**Summary**
- Extended `InMemorySqlGateway` with in-memory stores for `knowledge_sources` and `document_chunks`
- Normalize-match support for Task 94/95 SQL constants; unsupported SQL still throws
- Added `runSqlKnowledgeSourceRepositoryValidation` / `runSqlDocumentChunkRepositoryValidation`
- Wired `validate:repository:sql-source` and `validate:repository:sql-chunk` into top-level `validate`

**Validation**
- `pnpm validate:infra:in-memory-sql`
- `pnpm validate:repository:sql-document`
- `pnpm validate:repository:sql-source`
- `pnpm validate:repository:sql-chunk`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 97

**Date**
2026-07-20

**Commit**
b641790

**Title**
Add full SQL knowledge composition path and update roadmap

**Summary**
- Added `createSqlKnowledgeComposition` / `SqlKnowledgeComposition` sharing one `InMemorySqlGateway` for document+source+chunk SQL repositories
- Wired `validate:composition:sql-knowledge` end-to-end (source → document → chunk → cited-answer)
- Updated roadmap Postgres row (document+source+chunk via InMemorySqlGateway; real `pg` deferred) and Sprint 22 task range
- Kept document-only SQL composition and default in-memory/operations paths unchanged

**Validation**
- `pnpm validate:repository:sql-source`
- `pnpm validate:repository:sql-chunk`
- `pnpm validate:composition:sql-document`
- `pnpm validate:composition:sql-knowledge`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 98

**Date**
2026-07-20

**Commit**
f644987

**Title**
Define knowledge schema SQL and apply helper

**Summary**
- Added `knowledgeSchemaSql` DDL (sources/documents/chunks, IF NOT EXISTS) matching repository column/PK names
- Added `applyKnowledgeSchema(gateway)` helper; InMemorySqlGateway treats DDL as no-op
- Added `validate:infra:knowledge-schema` (schema apply + source/document/chunk save/find)
- Documented schema location and apply usage in deployment docs; no `pg` dependency

**Validation**
- `pnpm validate:repository:sql-document`
- `pnpm validate:repository:sql-source`
- `pnpm validate:repository:sql-chunk`
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 99

**Date**
2026-07-20

**Commit**
ca0be69

**Title**
Add PostgresSqlGateway with pg driver

**Summary**
- Added runtime `pg` and `@types/pg`; defined `PostgresPool` structural interface
- Added `PostgresSqlGateway` implementing `SqlGateway` via bound `pool.query`
- Exported from infra/top-level barrels; no live DB validation in this task

**Validation**
- `pnpm validate:infra:sql-gateway-contract`
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 100

**Date**
2026-07-20

**Commit**
0fd624d

**Title**
Add FakePostgresPool validation for PostgresSqlGateway

**Summary**
- Added `FakePostgresPool` delegating to InMemorySqlGateway (no network/Docker)
- Added `validate:infra:postgres-gateway` (upsert/select + schema/repository smoke)
- Added optional `validate:infra:postgres-live` (skip when DATABASE_URL unset; not in top-level validate)

**Validation**
- `pnpm validate:infra:postgres-gateway`
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 101

**Date**
2026-07-20

**Commit**
e26904d

**Title**
Add Postgres composition factory and update roadmap

**Summary**
- Added `createPostgresKnowledgeComposition` (pool inject, optional schema apply, SQL repos + fake cited-answer stack)
- Widened `SqlKnowledgeComposition.sqlGateway` to `SqlGateway` for InMemory/Postgres compatibility
- Wired `validate:composition:postgres-knowledge` via FakePostgresPool; updated roadmap/deployment docs
- Default in-memory/operations/SQL-in-memory paths unchanged; default validate remains dependency-free

**Validation**
- `pnpm validate:infra:postgres-gateway`
- `pnpm validate:composition:sql-knowledge`
- `pnpm validate:composition:postgres-knowledge`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 102

**Date**
2026-07-20

**Commit**
bfabd55

**Title**
Extend knowledge schema for embedding vectors

**Summary**
- Added `embedding_vectors` DDL (`workspace_id`, `chunk_id`, `vector_json`) to schema constants / apply helper
- Added `embeddingVectorSql` parameterized constants (upsert/select/delete/select-all)
- InMemorySqlGateway accepts embedding_vectors DDL as no-op; knowledge-schema validation covers DDL apply
- Documented as rebuildable search-index persistence (OpenSearch still deferred)

**Validation**
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 103

**Date**
2026-07-20

**Commit**
018e311

**Title**
Add SqlVectorIndex adapter

**Summary**
- Added `SqlVectorIndex` implementing `VectorIndex` via SqlGateway + embeddingVectorSql
- Same contracts as InMemoryVectorIndex (validation, defensive copy, cosine findNearest)
- InMemorySqlGateway vector SQL support deferred to Task 104; OpenSearch not included

**Validation**
- `pnpm validate:embedding:index`
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 104

**Date**
2026-07-20

**Commit**
8c7eefb

**Title**
Extend InMemorySqlGateway for embedding vector SQL and validate

**Summary**
- Extended InMemorySqlGateway with embedding_vectors store and SQL constant support
- Added `runSqlVectorIndexValidation` mirroring InMemoryVectorIndex contracts
- Wired `validate:embedding:sql-index` into top-level validate

**Validation**
- `pnpm validate:embedding:index`
- `pnpm validate:embedding:sql-index`
- `pnpm validate:infra:knowledge-schema`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 105

**Date**
2026-07-20

**Commit**
ce68c49

**Title**
Wire SqlVectorIndex into SQL/Postgres composition and update roadmap

**Summary**
- `createSqlKnowledgeComposition` / `createPostgresKnowledgeComposition` now share SqlVectorIndex on the same SqlGateway
- Default in-memory/operations composition keeps InMemoryVectorIndex
- Updated composition validations + roadmap OpenSearch row to Partial (SqlVectorIndex validated; OpenSearch deferred)

**Validation**
- `pnpm validate:embedding:sql-index`
- `pnpm validate:composition:sql-knowledge`
- `pnpm validate:composition:postgres-knowledge`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 106

**Date**
2026-07-20

**Commit**
a5558a1

**Title**
Define HTTP listen config and listener contract

**Summary**
- Added `HttpListenConfig`, `HttpListenAddress`, and `HttpListener` port (listen/close/isListening)
- KnowledgeServer remains dispatch-only; listener is a separate router-front adapter
- Added `validate:server:listener-contract` with FakeHttpListener; no node:http yet

**Validation**
- `pnpm validate:server:lifecycle`
- `pnpm validate:server:listener-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 107

**Date**
2026-07-20

**Commit**
b2a919f

**Title**
Add NodeHttpListener adapter

**Summary**
- Added `NodeHttpListener` using `node:http.createServer` over an injected HttpRouter
- Maps IncomingMessage to HttpRequest (GET/POST, pathname, lower-cased headers, JSON body)
- 405/400/500 JSON error responses; duplicate close throws; no Express/Fastify

**Validation**
- `pnpm validate:http:router`
- `pnpm validate:server:listener-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 108

**Date**
2026-07-20

**Commit**
a3b30e9

**Title**
Add ephemeral-port listener validation

**Summary**
- Added `runNodeHttpListenerValidation` on 127.0.0.1:0 with /health, 404, 405, and post-close failure
- Wired `validate:server:node-listener` into top-level validate; try/finally ensures close

**Validation**
- `pnpm validate:server:lifecycle`
- `pnpm validate:server:node-listener`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 109

**Date**
2026-07-20

**Commit**
6779930

**Title**
Add listening operations factory and update roadmap

**Summary**
- Added `createListeningOperationsServer` (operations wiring + NodeHttpListener; default 127.0.0.1:0)
- Kept `createOperationsKnowledgeServer` dispatch-only; wired `validate:composition:listening-operations`
- Updated roadmap TCP listen row to Partial; README/deployment listening examples

**Validation**
- `pnpm validate:server:node-listener`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 110

**Date**
2026-07-20

**Commit**
e03721e

**Title**
Define authentication contract and principal

**Summary**
- Added `AuthPrincipal` and `Authenticator` port (AuthN separate from WorkspaceAuthorizer AuthZ)
- Added `validate:security:auth-contract` with FakeAuthenticator; no JWT/OIDC SDK

**Validation**
- `pnpm validate:security:workspace`
- `pnpm validate:security:auth-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 111

**Date**
2026-07-20

**Commit**
0588e55

**Title**
Add API key authenticator and Bearer HTTP guard

**Summary**
- Added `ApiKeyAuthenticator` (static key map, defensive principal copy)
- Added `HttpBearerGuard` parsing `Authorization: Bearer <token>`
- Wired `validate:security:api-key` and `validate:security:bearer-guard`

**Validation**
- `pnpm validate:security:auth-contract`
- `pnpm validate:security:api-key`
- `pnpm validate:security:bearer-guard`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 112

**Date**
2026-07-20

**Commit**
1d5a4de

**Title**
Wire AuthN into cited-answer HTTP path

**Summary**
- `CitedGroundedAnswerController` / `createKnowledgeHttpRouter` take Bearer AuthN then workspace AuthZ (no `x-workspace-id`)
- AuthN → 401, AuthZ → 403; Health stays public
- Composition in-memory/operations/listening factories wire ApiKeyAuthenticator + HttpBearerGuard

**Validation**
- `pnpm validate:security:bearer-guard`
- `pnpm validate:api:cited-answer`
- `pnpm validate:server:node-listener`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 113

**Date**
2026-07-20

**Commit**
edc05a5

**Title**
Wire auth into listening operations factory and update roadmap

**Summary**
- `createOperationsKnowledgeServer` / `createListeningOperationsServer` require `apiKeys`
- README/deployment Bearer examples; roadmap AuthN → Partial (JWT/OIDC deferred)
- Sprint 26 task range recorded

**Validation**
- `pnpm validate:api:cited-answer`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 114

**Date**
2026-07-21

**Commit**
507d2cd

**Title**
Define LLM HTTP provider config and transport contract

**Summary**
- Added `LlmHttpProviderConfig` / `loadLlmHttpProviderConfig` and `LlmHttpTransport` request/response types
- Added `validate:ai:http-provider-contract` with Fake transport; no official LLM SDK

**Validation**
- `pnpm validate:ai:provider-contract`
- `pnpm validate:ai:http-provider-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 115

**Date**
2026-07-21

**Commit**
e4351a7

**Title**
Add OpenAI-compatible HttpLanguageModelProvider

**Summary**
- Added `HttpLanguageModelProvider` over `LlmHttpTransport` (chat/completions, Bearer, no SDK/`fetch`)
- Prompt fields mapped to messages unchanged; non-2xx / invalid JSON error mapping

**Validation**
- `pnpm validate:ai:fake-provider`
- `pnpm validate:ai:http-provider-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 116

**Date**
2026-07-21

**Commit**
191224f

**Title**
Add Fake transport validation and optional live-skip runner

**Summary**
- Added `validate:ai:http-provider` with FakeLlmHttpTransport (request shape + error mapping)
- Added optional `validate:ai:http-provider-live` (skip without LLM_API_KEY; not in top-level validate)

**Validation**
- `pnpm validate:ai:http-provider`
- `pnpm validate:ai:fake-provider`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 117

**Date**
2026-07-21

**Commit**
5cc3abd

**Title**
Add optional LLM provider composition wiring and update roadmap

**Summary**
- Added `FetchLlmHttpTransport`, `LlmProviderOption`, optional HTTP LLM on in-memory/sql/operations/listening (default Fake)
- Added `validate:composition:http-llm`; roadmap Real LLM → Partial; README/deployment LLM_API_KEY docs

**Validation**
- `pnpm validate:ai:http-provider`
- `pnpm validate:composition:in-memory`
- `pnpm validate:composition:http-llm`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 118

**Date**
2026-07-21

**Commit**
3dbb672

**Title**
Define MCP JSON-RPC contract and handler port

**Summary**
- Added `McpJsonRpcRequest`/`Response`/`Handler` and `tools/list`·`tools/call` constants
- Added `validate:mcp:jsonrpc-contract` with Fake handler; no official MCP SDK

**Validation**
- `pnpm validate:mcp:contract`
- `pnpm validate:mcp:jsonrpc-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 119

**Date**
2026-07-21

**Commit**
6c63b66

**Title**
Add DefaultMcpJsonRpcHandler over McpToolRegistry

**Summary**
- Added `DefaultMcpJsonRpcHandler` for tools/list·tools/call (registry-only; tool failures as result.isError)
- Added `validate:mcp:jsonrpc-handler`

**Validation**
- `pnpm validate:mcp:registry`
- `pnpm validate:mcp:jsonrpc-contract`
- `pnpm validate:mcp:jsonrpc-handler`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 120

**Date**
2026-07-21

**Commit**
d7f4677

**Title**
Add HTTP MCP transport adapter and validation

**Summary**
- Added `McpJsonRpcController` for `POST /mcp` (Bearer AuthN; tools/call workspace AuthZ via -32001)
- Added `validate:api:mcp-jsonrpc`

**Validation**
- `pnpm validate:mcp:jsonrpc-handler`
- `pnpm validate:api:cited-answer`
- `pnpm validate:api:mcp-jsonrpc`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 121

**Date**
2026-07-21

**Commit**
4103255

**Title**
Wire listening MCP endpoint and update roadmap

**Summary**
- Wired MCP registry/handler into composition; `POST /mcp` on knowledge HTTP router
- Operations/listening validations cover tools/list·tools/call; roadmap MCP transport → Partial

**Validation**
- `pnpm validate:mcp:jsonrpc-handler`
- `pnpm validate:api:mcp-jsonrpc`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 122

**Date**
2026-07-21

**Commit**
c0664e1

**Title**
Define OTLP HTTP transport and exporter config contract

**Summary**
- Added `OtlpHttpTransport` / request-response types and `loadOtlpExporterConfig`
- Added `validate:observability:otlp-contract`; no official OpenTelemetry SDK

**Validation**
- `pnpm validate:observability:contract`
- `pnpm validate:observability:otlp-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 123

**Date**
2026-07-21

**Commit**
0cbd7ed

**Title**
Add OTLP log and metrics exporters

**Summary**
- Added `OtlpLogsExporter` / `OtlpMetricsExporter` (deterministic OTLP JSON subset over transport)
- Added `validate:observability:otlp-exporters`

**Validation**
- `pnpm validate:observability:otlp-contract`
- `pnpm validate:observability:otlp-exporters`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 124

**Date**
2026-07-21

**Commit**
6c04bf6

**Title**
Add exporting Logger/Metrics adapters and Fake validation

**Summary**
- Added `ExportingLogger`/`ExportingMetrics` (sync log + async flush; buffer retained on export failure)
- Added `FetchOtlpHttpTransport`, `validate:observability:exporting`, optional `otlp-live` skip runner

**Validation**
- `pnpm validate:observability:otlp-exporters`
- `pnpm validate:observability:exporting`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 125

**Date**
2026-07-21

**Commit**
1e313c5

**Title**
Optional composition wiring and roadmap update

**Summary**
- Added `createOperationsObservability`; operations/listening enable OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (default InMemory)
- README/deployment OTEL docs; roadmap OpenTelemetry → Partial

**Validation**
- `pnpm validate:observability:exporting`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 126

**Date**
2026-07-21

**Commit**
ca4e186

**Title**
Define OpenSearch HTTP transport and config contract

**Summary**
- Added `OpenSearchHttpTransport` / request-response types and `loadOpenSearchClientConfig`
- Added `validate:embedding:opensearch-contract`; no official OpenSearch JS SDK

**Validation**
- `pnpm validate:embedding:index`
- `pnpm validate:embedding:sql-index`
- `pnpm validate:embedding:opensearch-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 127

**Date**
2026-07-21

**Commit**
6543b27

**Title**
Add OpenSearchVectorIndex over HTTP transport

**Summary**
- Added `OpenSearchVectorIndex` implementing `VectorIndex` via `OpenSearchHttpTransport`
- Index ensure + script_score cosine nearest; no official OpenSearch JS SDK

**Validation**
- `pnpm validate:embedding:opensearch-contract`
- `pnpm typecheck`

**Status**
Completed

## Task 128

**Date**
2026-07-21

**Commit**
b8f0e6c

**Title**
Add Fake OpenSearch transport validation

**Summary**
- Added `FakeOpenSearchHttpTransport` / `FetchOpenSearchHttpTransport`
- Added `validate:embedding:opensearch-index` (Fake) and optional `opensearch-live`

**Validation**
- `pnpm validate:embedding:sql-index`
- `pnpm validate:embedding:opensearch-index`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 129

**Date**
2026-07-21

**Commit**
1d0f989

**Title**
Optional composition wiring and roadmap update

**Summary**
- Added `createOpenSearchKnowledgeComposition` / `createOpenSearchVectorIndexFromEnv` (SQL SoT + OpenSearch VectorIndex)
- Documented OPENSEARCH_* env; roadmap OpenSearch notes + Sprint 30 range

**Validation**
- `pnpm validate:embedding:opensearch-index`
- `pnpm validate:composition:opensearch-knowledge`
- `pnpm validate:composition:sql-knowledge`
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 130

**Date**
2026-07-21

**Commit**
92f42c6

**Title**
Update portfolio for post-baseline Partial evidence

**Summary**
- Added Post-baseline infrastructure (Partial) section for Sprints 21–30
- Refreshed intentional non-goals to nested deferrals only; fixed Runtime TCP wording

**Validation**
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 131

**Date**
2026-07-21

**Commit**
e2b7947

**Title**
Align README, deployment, and modules docs

**Summary**
- Aligned README/deployment/modules/architecture/docker docs with post-baseline Partial evidence
- Added optional env summary; clarified dependency-free default validate

**Validation**
- `pnpm validate:project:closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 132

**Date**
2026-07-21

**Commit**
66535e1

**Title**
Add post-baseline closeout validation runner

**Summary**
- Added `scripts/validate-post-baseline-closeout.ts` for Sprints 21–30 Partial evidence
- Wired `validate:project:post-baseline-closeout` into top-level `pnpm validate`

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 133

**Date**
2026-07-21

**Commit**
431c6f8

**Title**
Finalize roadmap track closeout and Progress Log

**Summary**
- Declared Post-baseline Infrastructure Track CLOSED (Partial) on roadmap; added Sprint 31 range
- README/development closeout commands; track closeout complete for Sprints 21–30 Partial adapters (nested deferrals remain by design)

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 134

**Date**
2026-07-21

**Commit**
1f35a28

**Title**
Define JWT claims contract and verifier port

**Summary**
- Added `JwtClaims`, `JwtVerifier`, `JwtAuthConfig`, `loadJwtAuthConfig`
- Added `validate:security:jwt-contract`; no jsonwebtoken/jose/passport SDK

**Validation**
- `pnpm validate:security:auth-contract`
- `pnpm validate:security:jwt-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 135

**Date**
2026-07-21

**Commit**
08f1ba1

**Title**
Add Hs256JwtAuthenticator over Node crypto

**Summary**
- Added `Hs256JwtVerifier` / `Hs256JwtAuthenticator` (Node crypto HS256)
- Added `validate:security:jwt-hs256`

**Validation**
- `pnpm validate:security:jwt-contract`
- `pnpm validate:security:jwt-hs256`
- `pnpm validate:security:bearer-guard`
- `pnpm typecheck`

**Status**
Completed

## Task 136

**Date**
2026-07-21

**Commit**
a7c1f1c

**Title**
Add JWKS HTTP transport and Rs256JwtAuthenticator

**Summary**
- Added JWKS HTTP transport, `Rs256JwtVerifier`/`Rs256JwtAuthenticator`
- Added `validate:security:jwt-jwks` and optional `jwt-live`

**Validation**
- `pnpm validate:security:jwt-hs256`
- `pnpm validate:security:jwt-jwks`
- `pnpm typecheck`

**Status**
Completed

## Task 137

**Date**
2026-07-21

**Commit**
41bf875

**Title**
Optional composition JWT wiring and roadmap update

**Summary**
- Added dependency-free `AuthProviderOption` + factories (`createAuthenticatorFromOption` / `createAuthenticatorFromEnv`)
- Extended operations/listening composition to support optional JWT AuthN via `auth` (default remains ApiKey)
- Added `createOperationsKnowledgeServerFromEnv` helper (activates JWT only when explicitly requested)
- Added `validate:composition:jwt-auth` smoke for HS256 JWT → 401/200 behavior
- Updated roadmap/portfolio/deployment/README/docs to reflect JWT HS256 + JWKS RS256 OIDC-lite (official SDKs remain deferred)

**Validation**
- `pnpm validate:security:jwt-hs256`
- `pnpm validate:security:jwt-jwks`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:composition:jwt-auth`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 138

**Date**
2026-07-21

**Commit**
3d928a8

**Title**
Define Prometheus text exposition formatter (contract)

**Summary**
- Added dependency-free `toPrometheusText(points)` serializer for `MetricPoint[]`
- Added `validate:observability:prometheus-format` runner with deterministic output

**Validation**
- `pnpm validate:observability:prometheus-format`
- `pnpm typecheck`

**Status**
Completed

## Task 139

**Date**
2026-07-21

**Commit**
8c6d1f7

**Title**
Add GET `/metrics` handling in `ObservingHttpRouter`

**Summary**
- Added `GET /metrics` fast-path: bypasses inner router and returns Prometheus text via `toPrometheusText(this.metrics.getPoints())`
- Ensured self-reference safety by snapshotting metric points before incrementing `http.requests`

**Validation**
- `pnpm validate:http:observing`
- `pnpm typecheck`

**Status**
Completed

## Task 140

**Date**
2026-07-21

**Commit**
06f051a

**Title**
Add dependency-free validation runner for `/metrics`

**Summary**
- Added `runObservingHttpRouterPrometheusValidation.ts` to verify `/metrics` Prometheus text response, router logs, and `http.requests` increment
- Added `validate:http:prometheus-scrape` script
- Wired `validate:observability:prometheus-format` and `validate:http:prometheus-scrape` into top-level `pnpm validate`

**Validation**
- `pnpm validate:http:observing`
- `pnpm validate:http:prometheus-scrape`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 141

**Date**
2026-07-22

**Commit**
ae55e84

**Title**
Update roadmap/portfolio for Prometheus scrape progress

**Summary**
- Removed Prometheus scrape from remaining nested deferrals in roadmap status
- Documented Sprint 33 (Task 138–141) and `GET /metrics` Partial evidence
- Aligned portfolio / deployment / README: scrape implemented; `prom-client` and tracing remain deferred

**Validation**
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate`

**Status**
Completed

## Task 142

**Date**
2026-07-22

**Commit**
6f4d208

**Title**
Define Trace/Span contract and Tracer port

**Summary**
- Added dependency-free `TraceId`/`SpanId`/`SpanStatus`/`Span`/`Tracer` contract types
- Documented OTLP/HTTP spans with official SDK / W3C propagator suite deferred
- Added `validate:observability:tracer-contract` (Fake Tracer) and wired into `pnpm validate`

**Validation**
- `pnpm validate:observability:contract`
- `pnpm validate:observability:tracer-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 143

**Date**
2026-07-22

**Commit**
7ebb27e

**Title**
Add InMemoryTracer and OTLP traces exporter

**Summary**
- Added `InMemoryTracer` with injectable id/clock factories and `EndedSpan` snapshots
- Added `OtlpTracesExporter` (`/v1/traces`) and `ExportingTracer` (buffer + forceFlush retain-on-failure)
- Extended `resolveOtlpSignalUrl` for `/v1/traces`; added in-memory and otlp-traces validate scripts

**Validation**
- `pnpm validate:observability:tracer-contract`
- `pnpm validate:observability:otlp-traces`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 144

**Date**
2026-07-22

**Commit**
31dab8a

**Title**
Instrument ObservingHttpRouter with HTTP spans

**Summary**
- Added optional `tracer?: Tracer` to `ObservingHttpRouter` (default off)
- Records `http.request` spans on success/error including `/metrics` fast-path
- Minimal optional W3C `traceparent` parent continuation
- Added `validate:http:observing-tracing` and wired into `pnpm validate`

**Validation**
- `pnpm validate:http:observing`
- `pnpm validate:http:prometheus-scrape`
- `pnpm validate:http:observing-tracing`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 145

**Date**
2026-07-22

**Commit**
2fa65a6

**Title**
Optional composition wiring and roadmap update

**Summary**
- Extended `createOperationsObservability` with optional `ExportingTracer` when OTEL endpoint is set
- Wired tracer into operations/listening `ObservingHttpRouter`; flush includes `/v1/traces`
- Updated roadmap/portfolio/deployment/README/modules for Sprint 34 tracing Partial progress

**Validation**
- `pnpm validate:http:observing-tracing`
- `pnpm validate:observability:otlp-traces`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 146

**Date**
2026-07-22

**Commit**
b0901ba

**Title**
Define MCP stdio IO contract and config

**Summary**
- Added `McpStdioLineReader` / `McpStdioLineWriter` ports and `McpStdioSessionConfig`
- Updated mcp module docs for HTTP + stdio boundaries (official SDK deferred)
- Added `validate:mcp:stdio-contract` and wired into `pnpm validate`

**Validation**
- `pnpm validate:mcp:jsonrpc-contract`
- `pnpm validate:mcp:stdio-contract`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 147

**Date**
2026-07-22

**Commit**
026a48a

**Title**
Add StdioMcpJsonRpcSession over McpJsonRpcHandler

**Summary**
- Added `StdioMcpJsonRpcSession` for newline-delimited JSON-RPC over stdio ports
- Parse/oversized lines → -32700; invalid/notification (no id) → -32600; then continue
- Delegates valid requests to `McpJsonRpcHandler` (no Bearer on stdio)

**Validation**
- `pnpm validate:mcp:jsonrpc-handler`
- `pnpm validate:mcp:stdio-contract`
- `pnpm typecheck`

**Status**
Completed

## Task 148

**Date**
2026-07-22

**Commit**
43e8590

**Title**
Add Fake stdio streams validation

**Summary**
- Added `FakeMcpStdioLineReader` / `FakeMcpStdioLineWriter` and optional Node stream adapters
- Added `validate:mcp:stdio-session` covering tools/list·call, parse errors, EOF
- Wired stdio-session into top-level `pnpm validate`

**Validation**
- `pnpm validate:mcp:jsonrpc-handler`
- `pnpm validate:mcp:stdio-session`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 149

**Date**
2026-07-22

**Commit**
06605c4

**Title**
Optional composition entry and roadmap update

**Summary**
- Added `createInMemoryStdioMcpSession` / `createNodeStdioLineReaderWriter` and optional `pnpm mcp:stdio`
- Added `validate:composition:mcp-stdio` (Fake streams) to top-level validate
- Updated roadmap/portfolio/deployment/README/modules: HTTP `/mcp` default; stdio local path; official SDK deferred

**Validation**
- `pnpm validate:mcp:stdio-session`
- `pnpm validate:composition:mcp-stdio`
- `pnpm validate:api:mcp-jsonrpc`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 150

**Date**
2026-07-22

**Commit**
2382704

**Title**
Align portfolio for Sprint 32–35 expansion evidence

**Summary**
- Split portfolio Partial evidence: §3 post-baseline (21–30) vs §3b nested expansion (32–35)
- Documented JWT OIDC-lite, Prometheus `/metrics`, OTLP tracing, MCP stdio without Completing Partial
- Aligned intentional non-goals with roadmap (MCP stdio not listed as unimplemented)

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 151

**Date**
2026-07-22

**Commit**
a0c1f3a

**Title**
Align README, deployment, and modules docs

**Summary**
- README/deployment: nested expansion (JWT, `/metrics`, OTLP traces, MCP stdio) + dependency-free validate principle
- modules/architecture: ObservingHttpRouter metrics/tracing, JWT, composition stdio summaries aligned with portfolio

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 152

**Date**
2026-07-22

**Commit**
70c3446

**Title**
Add nested-expansion closeout validation runner

**Summary**
- Added `scripts/validate-nested-expansion-closeout.ts` (docs/Sprint 32–35/scripts/source asserts)
- Wired `validate:project:nested-expansion-closeout` after post-baseline in `pnpm validate`
- Documented the command in `docs/development.md`

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 153

**Date**
2026-07-22

**Commit**
493abf4

**Title**
Finalize roadmap track closeout and Progress Log

**Summary**
- Declared Nested Deferral Expansion Track: CLOSED (Partial) on roadmap; added Sprint 36 task-range
- Strengthened nested-expansion closeout validator with track CLOSED + Sprint 36 asserts
- README/development/portfolio record nested-expansion closeout and `validate:project:nested-expansion-closeout`

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm validate:composition:operations`
- `pnpm validate:composition:mcp-stdio`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 154

**Date**
2026-07-22

**Commit**
dd63ed2

**Title**
Declare Project 2 CLOSED and Project 3 handoff in portfolio

**Summary**
- Declared **Project 2: CLOSED** with three track CLOSED evidence table
- Added Project 3 Multi-Agent handoff (reuse vs non-goals) and Project 1→4 sequence
- Kept Partial adapters Partial; by-design deferrals unchanged

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 155

**Date**
2026-07-22

**Commit**
b04c137

**Title**
Align README, development, and roadmap for Project 2 final status

**Summary**
- README Status: Project 2 CLOSED + three-track table; previewed final-closeout command
- development.md: Sprint 37 final closeout flow; roadmap intro notes overall CLOSED pending Task 157 header

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 156

**Date**
2026-07-22

**Commit**
46f27bf

**Title**
Add Project 2 final-closeout validation runner

**Summary**
- Added `scripts/validate-project-final-closeout.ts` (portfolio CLOSED + three tracks + scripts)
- Wired `validate:project:final-closeout` after nested-expansion in `pnpm validate`
- Documented final closeout purpose in `docs/development.md`

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm validate:project:final-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed

## Task 157

**Date**
2026-07-22

**Commit**
fcdbdeb

**Title**
Finalize Project 2 CLOSED on roadmap and Progress Log

**Summary**
- Roadmap top header **Project 2: CLOSED** with three-track + Sprint 37 handoff summary
- Strengthened `validate:project:final-closeout` with `Project 2: CLOSED` + Sprint 37 asserts
- README/development record final-closeout command; Project 2 final closeout complete

**Validation**
- `pnpm validate:project:closeout`
- `pnpm validate:project:post-baseline-closeout`
- `pnpm validate:project:nested-expansion-closeout`
- `pnpm validate:project:final-closeout`
- `pnpm typecheck`
- `pnpm validate`

**Status**
Completed


## Task 219

**Date**
2026-07-23

**Commit**
5ea63b7

**Title**
Record P2 Service Completion Phase A track

**Summary**
- Roadmap: P2 Service Completion Track Active — Phase A (human-authorized)
- AGENT_OPERATIONS_GUIDE / development / portfolio point at Phase A
- Project 2: CLOSED preserved; P3/P4 frozen; no Project 5; no runtime code

**Validation**
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 220

**Date**
2026-07-23

**Commit**
a9e5f22

**Title**
Add pnpm start HTTP host entrypoint

**Summary**
- Added listeningOperationsHostConfig + runListeningOperationsHost
- package.json start → NodeHttpListener host (Fake LLM, InMemory)
- Env HOST/PORT/API_KEY/API_KEY_SUBJECT/WORKSPACE_ID/SKIP_DEMO_SEED
- seedDemoKnowledge stub (filled in Task 221)

**Validation**
- `pnpm validate:composition:listening-operations`
- `pnpm validate:server:node-listener`
- `pnpm typecheck`
- Manual: pnpm start → GET /health 200

**Status**
Completed

## Task 221

**Date**
2026-07-23

**Commit**
22c7671

**Title**
Add demo seed for local cited-answers

**Summary**
- Implemented seedDemoKnowledge with demo document/chunk/vector
- Stable token aaaaaaaa for FakeEmbedding retrieval hits
- Host seeds on start unless SKIP_DEMO_SEED=1

**Validation**
- `pnpm typecheck`
- `pnpm validate:composition:listening-operations`
- Manual: start + cited-answers Bearer → 200 grounded answer

**Status**
Completed

## Task 222

**Date**
2026-07-23

**Commit**
d40d60a

**Title**
Add start smoke validation + README Phase A docs

**Summary**
- Added runListeningOperationsHostSmokeValidation (health + cited-answers)
- Wired validate:server:start-smoke into top-level pnpm validate
- README/development/roadmap Phase A deliverables; P3/P4 freeze reminder

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:composition:listening-operations`
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 223

**Date**
2026-07-23

**Commit**
67c893c

**Title**
Close Phase A and open Phase B on roadmap

**Summary**
- Roadmap: Phase A Complete; Track Active — Phase B (optional HTTP LLM)
- AGENT_OPERATIONS_GUIDE / development / portfolio updated
- Project 2 CLOSED preserved; P3/P4 frozen; no runtime code

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 224

**Date**
2026-07-23

**Commit**
f32b9a2

**Title**
Wire optional HTTP LLM into pnpm start

**Summary**
- Host uses HttpLanguageModelProvider when LLM_API_KEY is set
- Fake LLM default when key unset; logs LLM: fake|http on start
- Reuses loadLlmHttpProviderConfig (LLM_BASE_URL / LLM_MODEL / timeout)

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:composition:listening-operations`
- `pnpm typecheck`

**Status**
Completed

## Task 225

**Date**
2026-07-23

**Commit**
dcd6076

**Title**
Add optional live HTTP LLM host smoke (skip without key)

**Summary**
- Added validate:server:start-llm-live (skip exit 0 without LLM_API_KEY)
- Not wired into top-level pnpm validate
- Documented in development.md / README

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:server:start-llm-live`
- `pnpm typecheck`

**Status**
Completed

## Task 226

**Date**
2026-07-23

**Commit**
cded9e1

**Title**
Document Phase B LLM env and .env.example

**Summary**
- README: Phase A Complete; Phase B optional LLM_* table
- Added .env.example (HOST/PORT/API_KEY/WORKSPACE_ID/SKIP_DEMO_SEED/LLM_*)
- development: start-smoke vs start-llm-live; roadmap Sprint 58 note

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 227

**Date**
2026-07-23

**Commit**
366ac48

**Title**
Extend Postgres composition + seed surface for host

**Summary**
- Postgres/SQL compositions: optional llm + mcpJsonRpcHandler
- SqlKnowledgeComposition exposes mcpJsonRpcHandler
- seedDemoKnowledge accepts SeedableKnowledgeSurface (InMemory + SQL)

**Validation**
- `pnpm validate:composition:postgres-knowledge`
- `pnpm validate:server:start-smoke`
- `pnpm typecheck`

**Status**
Completed

## Task 228

**Date**
2026-07-23

**Commit**
3b7e9ef

**Title**
Add listening factory for SQL/Postgres composition

**Summary**
- Extracted createListeningOperationsServerFromComposition shared wire helper
- InMemory createListeningOperationsServer reuses the helper
- Exported ListeningCompositionSurface for Postgres host path

**Validation**
- `pnpm validate:composition:listening-operations`
- `pnpm validate:composition:postgres-knowledge`
- `pnpm typecheck`

**Status**
Completed

## Task 229

**Date**
2026-07-23

**Commit**
3581593

**Title**
Wire DATABASE_URL into pnpm start host

**Summary**
- createConfiguredListeningHost: InMemory default; Postgres when DATABASE_URL set
- Logs STORE: inmemory|postgres; ends pg Pool on shutdown
- Optional HTTP LLM + SKIP_DEMO_SEED still apply on both paths

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm typecheck`

**Status**
Completed

## Task 230

**Date**
2026-07-23

**Commit**
1133456

**Title**
FakePostgres listening smoke + optional live + docs

**Summary**
- Added validate:server:start-postgres-smoke (FakePostgresPool; in pnpm validate)
- Added validate:server:start-postgres-live (skip when DATABASE_URL unset; not in validate)
- Documented DATABASE_URL dual-path; Phase B Postgres slice on roadmap; OpenSearch later

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:server:start-postgres-smoke`
- `pnpm validate:server:start-postgres-live` (skip OK)
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 231

**Date**
2026-07-23

**Commit**
a841429

**Title**
Prepare OpenSearch composition for listening host

**Summary**
- createOpenSearchKnowledgeComposition is async; optional pool for Postgres SoT
- VectorIndex remains OpenSearch; InMemorySql path kept for Fake smokes
- Validator covers InMemorySql+OS and FakePostgres+OS; mcpJsonRpcHandler asserted

**Validation**
- `pnpm validate:composition:opensearch-knowledge`
- `pnpm validate:composition:postgres-knowledge`
- `pnpm validate:server:start-smoke`
- `pnpm validate:server:start-postgres-smoke`
- `pnpm typecheck`

**Status**
Completed

## Task 232

**Date**
2026-07-23

**Commit**
6b3321c

**Title**
Wire OPENSEARCH_URL into pnpm start host

**Summary**
- Host storeMode: inmemory | postgres | opensearch | postgres+opensearch
- VECTOR log: inmemory | sql | opensearch; FetchOpenSearch when URL set
- OPENSEARCH unset paths unchanged; both URLs → Postgres SoT + OpenSearch

**Validation**
- `pnpm validate:server:start-smoke`
- `pnpm validate:server:start-postgres-smoke`
- `pnpm typecheck`

**Status**
Completed

## Task 233

**Date**
2026-07-23

**Commit**
f8b6b2a

**Title**
Add FakeOpenSearch listening smoke to pnpm validate

**Summary**
- validate:server:start-opensearch-smoke (InMemorySql + FakeOpenSearch)
- validate:server:start-postgres-opensearch-smoke combo; both in pnpm validate
- Existing InMemory + FakePostgres smokes remain green

**Validation**
- `pnpm validate:server:start-opensearch-smoke`
- `pnpm validate:server:start-smoke`
- `pnpm validate:server:start-postgres-smoke`
- `pnpm typecheck`

**Status**
Completed

## Task 234

**Date**
2026-07-23

**Commit**
afcec70

**Title**
Optional live OpenSearch smoke + docs/roadmap

**Summary**
- validate:server:start-opensearch-live (skip without OPENSEARCH_URL; not in validate)
- Documented OPENSEARCH_* + STORE/VECTOR matrix; Phase B OpenSearch slice on roadmap
- Phase B not marked Complete; remaining compose app / closeout

**Validation**
- `pnpm validate:server:start-opensearch-smoke`
- `pnpm validate:server:start-opensearch-live` (skip OK)
- `pnpm validate:project:final-closeout`
- `pnpm validate:project03:closeout`
- `pnpm validate:project04:closeout`
- `pnpm typecheck`

**Status**
Completed

## Task 235

**Date**
2026-07-23

**Commit**
9a2ae78

**Title**
Point Dockerfile runner at pnpm start

**Summary**
- Runner CMD pnpm start; EXPOSE 8080; HOST=0.0.0.0 container defaults
- InMemory/Fake LLM default; no Postgres/OpenSearch required in image
- Updated deployment.md application image section

**Validation**
- `pnpm typecheck`
- `pnpm validate:server:start-smoke`
- `pnpm validate:deployment:readiness`

**Status**
Completed

## Task 236

**Date**
2026-07-23

**Commit**
4c5fa54

**Title**
Add compose app service

**Summary**
- Added app service (InMemory pnpm start) and app-full profile (Postgres+OpenSearch)
- Kept postgres/opensearch services; updated docker/README and .env.example

**Validation**
- `pnpm infra:config`
- `pnpm typecheck`

**Status**
Completed

## Task 237

**Date**
2026-07-23

**Commit**
Pending

**Title**
Extend static deployment/compose validation

**Summary**
- Assert Dockerfile CMD pnpm start + EXPOSE 8080
- Assert compose app service and package.json start host script
- Still daemon-free for readiness; infra:config remains optional compose check

**Validation**
- `pnpm validate:deployment:readiness`
- `pnpm infra:config`
- `pnpm validate:server:start-smoke`
- `pnpm typecheck`

**Status**
Completed
