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
