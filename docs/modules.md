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
descending by score, then ascending by `chunkId` to break ties. Task 25
adds the `retrieval` module's `VectorRetriever` port and
`DefaultVectorRetriever` adapter, wiring `EmbeddingProvider`,
`VectorIndex`, and `DocumentChunkRepository` ports into a single
embed-query → find-nearest → hydrate-chunk retrieval flow, excluding stale
vectors whose chunk no longer exists. Task 26 adds
`RetrieveKnowledgeChunksUseCase` to `application`, injecting only the
`VectorRetriever` port, validating `workspaceId`/`query`/`limit` at the
application boundary, and returning the retriever's `RetrievalResult`
unchanged. Task 27 adds `DocumentChunkRepository.findAll(workspaceId)`,
returning every chunk in a workspace ordered deterministically by
`documentId`, then `order`, then `id` — the foundation for Task 28's
keyword search. Task 28 adds the `search` module's `KeywordSearch` port
and `DefaultKeywordSearch` adapter, wiring only `DocumentChunkRepository`
into a deterministic exact-token-match lexical ranking over
`findAll`'s whole-workspace chunk scan. Task 29 adds `HybridSearch` and
`DefaultHybridSearch`, wiring only `VectorRetriever` and `KeywordSearch`
into a deterministic reciprocal-rank-fusion combination of both. Task 30
adds `RetrieveHybridKnowledgeChunksUseCase` to `application`, injecting
only the `HybridSearch` port, mirroring `RetrieveKnowledgeChunksUseCase`'s
validation-then-delegate shape. Task 31 adds the `context` module's
grounding context contract — `ContextAssemblyInput`,
`GroundingContextBlock`, `GroundingContext`, and the `ContextAssembler`
port — defining how ranked, retrieved chunks and their document
provenance are turned into a bounded, deterministic grounding context.
Task 32 adds `DefaultContextAssembler`, injecting only the
`KnowledgeDocumentRepository` port to hydrate each ranked chunk's
provenance, render fixed-format blocks, and enforce a whole-block
character budget with deterministic truncation. Task 33 adds
`RetrieveGroundingContextUseCase` to `application`, injecting only the
`HybridSearch` and `ContextAssembler` ports, mapping its own
`workspaceId`/`query`/`retrievalLimit`/`maxCharacters` input into a
`HybridSearch.search` call followed by a `ContextAssembler.assemble` call
over that result's chunks, and returning the resulting `GroundingContext`
unchanged. Task 37 swaps that injected search dependency to
`RerankedSearch`, so the use case's flow becomes
`RerankedSearch.search` → `ContextAssembler.assemble`; its own input
contract, the `ContextAssembler` delegation shape, and
`RetrieveHybridKnowledgeChunksUseCase`/`RetrieveKnowledgeChunksUseCase`
are all unchanged. Task 34 adds the `search` module's re-ranking contract —
`RerankingInput` (`workspaceId`, `query`, `chunks: RetrievedChunk[]`) and
the `Reranker` port (`rerank(input): Promise<RetrievedChunk[]>`) —
defining how an already-retrieved candidate set is deterministically
re-ordered by query relevance. Task 35 extracts `DefaultKeywordSearch`'s
Unicode letter/number lowercased tokenization into a shared internal
`tokenize` utility (behavior unchanged) and adds `DefaultReranker`, a
`Reranker` adapter with no constructor dependency at all, scoring each
candidate by unique query-token coverage plus token density plus its own
original retrieved score. Task 36 adds the `RerankedSearch` port and its
`DefaultRerankedSearch` adapter, wiring only `HybridSearch` and
`Reranker`: it runs a hybrid search first, then passes that result's
chunks to the reranker, returning the reranker's own chunk order as its
`RetrievalResult` unchanged (never re-sorting a second time). Task 38
adds the `prompt` module's grounded-prompt contract — `GroundedPrompt`
(`systemInstruction`, `userMessage`, both plain strings) and the
`PromptBuilder` port (`build(context: GroundingContext):
Promise<GroundedPrompt>`) — defining how a `GroundingContext` is turned
into an LLM-independent prompt representation. Task 39 adds
`DefaultPromptBuilder`, a `PromptBuilder` adapter with no constructor
dependency at all: `systemInstruction` is always the same fixed
instruction string, and `userMessage` is a fixed
`Question:\n<query>\n\nGrounding context status:
<complete|truncated>\n\nGrounding context:\n<content|[none]>` format,
using `GroundingContext.content` verbatim (never re-derived from
`blocks`) so the prompt never contains evidence outside what
`ContextAssembler` already assembled. Task 40 adds
`BuildGroundedPromptUseCase` to `application`, injecting only
`RetrieveGroundingContextUseCase` and the `PromptBuilder` port: it maps
its own `workspaceId`/`query`/`retrievalLimit`/`maxCharacters` input into
a `RetrieveGroundingContextUseCase.execute` call followed by a
`PromptBuilder.build` call over that result's `GroundingContext`,
returning the resulting `GroundedPrompt` unchanged — no LLM call or
citation concern here. Task 41 adds the `ai` module's LLM generation
contract — `GeneratedText` (`text: string`) and the
`LanguageModelProvider` port (`generate(prompt: GroundedPrompt):
Promise<GeneratedText>`) — defining how a `GroundedPrompt` is turned
into plain generated text (not yet a grounded answer or citation). Task
42 adds `FakeLanguageModelProvider`, a `LanguageModelProvider` adapter
with no external dependency at all (no network, API key, or model SDK):
it validates the given `GroundedPrompt` (`systemInstruction` non-empty,
`userMessage` a string) and echoes `userMessage` back as
`GeneratedText.text` unchanged — a deterministic double for validating
the contract and downstream application flow, never for producing a
real answer. Task 43 adds `GenerateGroundedTextUseCase` to
`application`, injecting only `BuildGroundedPromptUseCase` and the
`LanguageModelProvider` port: it maps its own
`workspaceId`/`query`/`retrievalLimit`/`maxCharacters` input into a
`BuildGroundedPromptUseCase.execute` call followed by a
`LanguageModelProvider.generate` call over that result's
`GroundedPrompt`, returning the resulting `GeneratedText` unchanged —
plain generated text, not yet a grounded answer or citation. Task 44
adds the `rag` module's grounded-answer assembly contract —
`GroundedAnswer` (`text`, `evidence: GroundingContextBlock[]`,
`insufficientEvidence`), `GroundedAnswerAssemblyInput` (`context:
GroundingContext`, `generatedText: GeneratedText`), and the
`GroundedAnswerAssembler` port (`assemble(input):
Promise<GroundedAnswer>`) — defining how generated text and grounding
evidence are explicitly combined into one answer, with
insufficient-evidence policy as this module's own responsibility. Task
45 adds `DefaultGroundedAnswerAssembler`, a `GroundedAnswerAssembler`
adapter with no constructor dependency at all: when `context.blocks` is
empty it **discards** the given generated text and returns the fixed
message "The available knowledge does not contain enough information."
with empty `evidence` and `insufficientEvidence: true`; when
`context.blocks` has at least one entry (even a truncated context) it
returns `generatedText.text` unchanged plus a defensive copy of
`context.blocks` as `evidence`, with `insufficientEvidence: false`. Task
46 adds `GenerateGroundedAnswerUseCase` to `application`, injecting the
grounding-context retrieval use case plus the prompt builder, LLM
provider, and grounded-answer assembler ports: it always resolves the
grounding context first, then — only if that context carries at least
one evidence block — builds a prompt and generates text from it before
handing both the context and the generated text to the assembler;
when the context has no evidence, the prompt builder and LLM provider
are never called, and the assembler is called with an empty generated
text so its insufficient-evidence policy is what decides the final
answer. Task 47 adds the `citation` module's citation contract —
`Citation` (`id`, `sourceId`, `documentId`, `chunkId`, `score`,
`excerpt`), `CitedGroundedAnswer` (`answer: GroundedAnswer`,
`citations: Citation[]`), and the `CitationBuilder` port
(`build(answer): Promise<Citation[]>`) — defining how a grounded
answer's evidence is converted into deterministic citations, with the
evidence-only citation policy as this module's own responsibility. Task
48 adds `DefaultCitationBuilder`, a `CitationBuilder` adapter with no
constructor dependency at all: it walks `answer.evidence` in order
(never re-sorts), emits exactly one `Citation` per block with
deterministic `id` =
`cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`,
copied provenance, and `excerpt` = block `text` (no truncation); an
empty evidence list yields an empty `Citation[]` — never a fabricated
citation. Task 49 adds `GenerateCitedGroundedAnswerUseCase` to
`application`, injecting the grounded-answer generation use case plus
the citation-builder port: it always generates a grounded answer first,
then builds citations from that answer's evidence (including the
insufficient-evidence path, which yields empty citations), and returns
`{ answer, citations }` as a `CitedGroundedAnswer` unchanged. Task 50
adds the `mcp` module as a transport-independent MCP capability
boundary — `McpToolName`, `McpToolDefinition`, `McpToolInvokeInput`,
`McpToolInvokeResult`, and the `McpTool` port — so a cited grounded
answer can later be exposed as an MCP tool without Domain/RAG
business-logic duplication and without an MCP SDK or network transport.
Task 51 adds `GenerateCitedGroundedAnswerMcpTool`, which injects only
`GenerateCitedGroundedAnswerUseCase`, exposes fixed definition
constants, and converts invalid input / use-case failure into
non-throwing `ok: false` results. Task 52 adds `McpToolRegistry` /
`DefaultMcpToolRegistry`: holds a readonly `McpTool[]`, rejects
duplicate names at construction, lists definitions in name-ascending
order, delegates known invokes, and returns structured unknown-tool
errors (with `name`/`toolName` widened to plain `string`). Task 53 adds
`InvokeMcpToolUseCase` to `application`, injecting only the
`McpToolRegistry` port: it validates `{ name, arguments }` at the
application boundary, delegates to `McpToolRegistry.invoke`, and
returns the result unchanged. Task 54 adds the `tools` module as a
transport-independent Tool Calling boundary — `ToolCallStatus`,
`ToolCallRequest`, `ToolCallResult`, and the `ToolExecutor` port —
sitting above MCP capability exposure so validated tool calls
(including timeout and failure statuses) can be expressed without
Domain/RAG business-logic duplication and without an MCP SDK or Agent
orchestrator. Task 55 adds `DefaultToolExecutor`, which injects only
`McpToolRegistry`, validates request shape (including `timeoutMs`),
and maps MCP success/unknown-tool/failure/throw onto structured
ToolCall statuses. Task 56 adds a dependency-free `timeoutMs` race:
when the timeout wins, it returns `status: "timeout"` without throwing;
when the registry wins first, existing success/failure mapping is
unchanged. Task 57 adds `ExecuteToolCallUseCase` to `application`,
injecting only the `ToolExecutor` port: it validates
`{ name, arguments, timeoutMs }` at the application boundary, delegates
to `ToolExecutor.execute`, and returns the result unchanged (existing
`InvokeMcpToolUseCase` retained). Task 58 adds the `agent` module as a
role-separated Agent Orchestration boundary above Tool Calling —
`AgentRole`, `AgentGoal`, `AgentPlanStep`, `AgentPlan`,
`AgentStepResult`, `AgentReviewDecision`, `AgentReviewResult`,
`AgentExecutionStatus`, `AgentRunResult`, and the
`AgentPlanner` / `AgentStepExecutor` / `AgentReviewer` /
`AgentOrchestrator` ports — so knowledge-aware plan execution and
review can be expressed without Memory, LLM freeform planning,
multi-agent collaboration, or composition-root wiring. Concrete
adapters are later tasks.
Other modules remain skeleton boundaries until scoped.

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`, `KnowledgeSource`, `DocumentChunk`), all workspace-scoped via `workspaceId`. Zero outward dependencies. |
| `application` | Use cases (list/page/create/update/delete/search/export for documents; create for sources; retrieve for chunks), each scoped to a `workspaceId`, over domain types and ports. `RetrieveKnowledgeChunksUseCase` depends only on the `VectorRetriever` port; `RetrieveHybridKnowledgeChunksUseCase` depends only on the `HybridSearch` port; `RetrieveGroundingContextUseCase` depends only on the `RerankedSearch` and `ContextAssembler` ports, delegating a reranked search and then a context assembly in sequence; `BuildGroundedPromptUseCase` depends only on `RetrieveGroundingContextUseCase` and the `PromptBuilder` port, delegating a grounding-context retrieval and then a prompt build in sequence; `GenerateGroundedTextUseCase` depends only on `BuildGroundedPromptUseCase` and the `LanguageModelProvider` port, delegating a grounded-prompt build and then an LLM generation call in sequence; `GenerateGroundedAnswerUseCase` depends on `RetrieveGroundingContextUseCase` plus `PromptBuilder`/`LanguageModelProvider`/`GroundedAnswerAssembler`, skipping prompt/generation when evidence is absent; `GenerateCitedGroundedAnswerUseCase` depends only on `GenerateGroundedAnswerUseCase` and `CitationBuilder`, returning `{ answer, citations }` unchanged; `InvokeMcpToolUseCase` depends only on the `McpToolRegistry` port, validating `{ name, arguments }` then delegating to `invoke`; `ExecuteToolCallUseCase` depends only on the `ToolExecutor` port, validating `{ name, arguments, timeoutMs }` then delegating to `execute`. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository`, `KnowledgeSourceRepository`, `DocumentChunkRepository`); methods take `workspaceId` (chunk methods also take `documentId`; `findById` resolves by `id` alone, a workspace-global identity; `findAll` returns every workspace chunk in deterministic `documentId` → `order` → `id` order). |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`, `DefaultInMemoryKnowledgeSourceRepository`, `DefaultInMemoryDocumentChunkRepository`; DB adapters later). |
| `pipeline` | Ingestion pipelines from external knowledge sources. `KnowledgeSourceConnector` port + `FakeKnowledgeSourceConnector` fixture adapter fetch normalized documents (`externalId`/`title`/`text`) for a `KnowledgeSource`; `SyncKnowledgeSourcePipeline` turns those into idempotent, deterministically-keyed `KnowledgeDocument` writes via the repository ports. `ChunkKnowledgeDocumentPipeline` chunks a single stored document via `ChunkingService` and fully replaces its chunk set via `DocumentChunkRepository`; `RechunkKnowledgeSourcePipeline` re-chunks every document of one source by delegating each to `ChunkKnowledgeDocumentPipeline`. `EmbedDocumentChunksPipeline` embeds one document's chunks via `EmbeddingProvider` and upserts one vector per chunk into `VectorIndex`, validating the whole result set before any write; `ReindexKnowledgeSourceEmbeddingsPipeline` re-embeds every document of one source by delegating each to `EmbedDocumentChunksPipeline`. No document/chunk deletion, automatic chunking/embedding during sync, background scheduling, or real connector yet. |
| `embedding` | Chunking, embedding, and vector indexing ports/adapters. `ChunkingService` port + `FixedSizeDocumentChunker` deterministic, fixed-size adapter split a `KnowledgeDocument` into ordered `DocumentChunk`s. `EmbeddingProvider` port + `FakeEmbeddingProvider` deterministic adapter turn text into a fixed-`EMBEDDING_VECTOR_DIMENSION` (8) vector. `VectorIndex` port + `InMemoryVectorIndex` adapter upsert/find an `EmbeddingVector` by `(workspaceId, chunkId)`, and rank vectors within a workspace via `findNearest` (cosine similarity, `ScoredEmbeddingVector[]`). Chunk hydration and hybrid search are handled by `retrieval`/`search`; cross-encoder re-ranking is still deferred. |
| `retrieval` | `VectorRetriever` port + `DefaultVectorRetriever` adapter turn a `RetrievalInput` (`workspaceId`, `query`, `limit`) into a `RetrievalResult` (`query`, ranked `RetrievedChunk[]`) by embedding the query via `EmbeddingProvider`, ranking via `VectorIndex.findNearest`, and hydrating each result to its `DocumentChunk` via `DocumentChunkRepository.findById` — excluding stale results. Keyword/hybrid retrieval and context assembly are handled by `search`/`context`; re-ranking is still deferred. |
| `search` | Search engine abstraction (keyword, vector, hybrid, re-ranking). `KeywordSearch` port + `DefaultKeywordSearch` adapter turn a `RetrievalInput` into a `RetrievalResult` by loading every chunk in the workspace via `DocumentChunkRepository.findAll`, tokenizing query/chunk text into lowercased Unicode letter/number tokens, and scoring by summed exact match counts of the query's de-duplicated tokens. `HybridSearch` port + `DefaultHybridSearch` adapter wire only `VectorRetriever` and `KeywordSearch`, running both with the same `RetrievalInput` and fusing their results by chunk id via reciprocal-rank fusion (`1 / (60 + rank)` per source, summed for chunks found by both). `RerankingInput` (`workspaceId`, `query`, `chunks: RetrievedChunk[]`) + the `Reranker` port (`rerank(input): Promise<RetrievedChunk[]>`) define how a candidate set is deterministically re-ordered by query relevance. `DefaultReranker` (no constructor dependency) scores each candidate as unique query-token coverage + token density + its own original retrieved score (over the same shared `tokenize` utility `DefaultKeywordSearch` uses), sorted by that score descending then chunk id ascending, returning every candidate as fresh, unmutated objects. `RerankedSearch` port + `DefaultRerankedSearch` adapter wire only `HybridSearch` and `Reranker`: it validates a `RetrievalInput`, calls `HybridSearch.search`, passes that result's chunks to `Reranker.rerank({ workspaceId, query, chunks })`, and returns the reranker's own chunk order as its `RetrievalResult` unchanged. |
| `context` | Prompt context assembly from retrieved documents. `ContextAssemblyInput` (`workspaceId`, `query`, ranked `RetrievedChunk[]`, `maxCharacters`) + `GroundingContext` (`query`, ordered `GroundingContextBlock[]`, rendered `content`, `truncated`) define the `ContextAssembler` port's `assemble` contract. `DefaultContextAssembler` (its default adapter) depends only on `KnowledgeDocumentRepository`, hydrating each ranked chunk's document provenance in the given order, rendering each as `[sourceId=...;documentId=...;chunkId=...]\n<chunk text>` joined by a blank line, including a block only if it fits the remaining `maxCharacters` budget whole, and skipping (never truncating) an oversized or stale-document candidate while still evaluating later chunks; Prompt Builder / Citation wiring is still deferred. |
| `prompt` | Prompt construction from a `GroundingContext`. `GroundedPrompt` (`systemInstruction`, `userMessage`, both plain strings) + the `PromptBuilder` port (`build(context: GroundingContext): Promise<GroundedPrompt>`) define an LLM-independent prompt representation. `DefaultPromptBuilder` (no constructor dependency) renders a fixed `systemInstruction` and a fixed `Question:\n<query>\n\nGrounding context status: <complete\|truncated>\n\nGrounding context:\n<content\|[none]>` `userMessage`, using `content` verbatim and never calling or constructing an LLM provider. |
| `citation` | Citation building from grounded-answer evidence. `Citation` (`id`, `sourceId`, `documentId`, `chunkId`, `score`, `excerpt`) + `CitedGroundedAnswer` (`answer: GroundedAnswer`, `citations: Citation[]`) + the `CitationBuilder` port (`build(answer): Promise<Citation[]>`) define an explicit contract for converting `GroundedAnswer.evidence` into deterministic citations — this is where the evidence-only citation policy lives (never fabricating a citation outside evidence). `DefaultCitationBuilder` (no constructor dependency) emits exactly one citation per evidence block in order, with `id` = `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`, copied provenance, and `excerpt` = block `text` (no truncation); empty evidence → empty citation list. |
| `rag` | RAG answer assembly (answer + citations). `GroundedAnswer` (`text`, `evidence: GroundingContextBlock[]`, `insufficientEvidence`) + `GroundedAnswerAssemblyInput` (`context: GroundingContext`, `generatedText: GeneratedText`) + the `GroundedAnswerAssembler` port (`assemble(input): Promise<GroundedAnswer>`) define an explicit contract for combining generated text with grounding evidence — this is where insufficient-evidence policy lives, never in `PromptBuilder`/`LanguageModelProvider`. `DefaultGroundedAnswerAssembler` (no constructor dependency) discards generated text and returns a fixed insufficient-evidence message when `context.blocks` is empty, otherwise returns `generatedText.text` plus a defensive copy of `context.blocks` as evidence — truncation alone is never treated as evidence absence. |
| `ai` | AI provider abstraction (fake + real providers). `GeneratedText` (`text: string`, not yet a grounded answer or citation) + the `LanguageModelProvider` port (`generate(prompt: GroundedPrompt): Promise<GeneratedText>`) define a provider-independent LLM generation contract; `GroundedPrompt` is its only prompt input. `FakeLanguageModelProvider` (no external dependency) validates the prompt and echoes `userMessage` back as `text`, for contract/flow validation only — never a real answer. A real provider is still deferred. |
| `mcp` | Transport-independent MCP tool capability exposure. `McpToolName` (`"generate_cited_grounded_answer"`), `McpToolDefinition` (`name`, `description`, `inputKeys: readonly string[]`), `McpToolInvokeInput` (`name: string`, `arguments`), `McpToolInvokeResult` (`ok`, `toolName: string`, optional `result: CitedGroundedAnswer` / `error`), the `McpTool` port (`definition` + `invoke(args)`), and the `McpToolRegistry` port (`listTools` / `invoke`) define how application capabilities are exposed as MCP tools without Domain/RAG business-logic duplication and without an MCP SDK or network transport. `GenerateCitedGroundedAnswerMcpTool` injects only `GenerateCitedGroundedAnswerUseCase` and converts failures into non-throwing `ok: false` results. `DefaultMcpToolRegistry` holds a readonly `McpTool[]`, rejects duplicate names, lists definitions name-ascending, and returns structured unknown-tool errors. |
| `tools` | Transport-independent Tool Calling boundary above MCP capability exposure. `ToolCallStatus` (`"success" \| "invalid_request" \| "unknown_tool" \| "timeout" \| "failure"`), `ToolCallRequest` (`name`, `arguments`, `timeoutMs`), `ToolCallResult` (`ok`, `status`, `toolName`, optional `result`/`error`, `durationMs`), and the `ToolExecutor` port (`execute(request): Promise<ToolCallResult>`) define validated tool-call request/result contracts without an MCP SDK, network transport, or Agent orchestrator. `DefaultToolExecutor` injects only `McpToolRegistry`, maps MCP success/unknown-tool/failure results onto ToolCall statuses, races invoke against `timeoutMs` for structured `timeout` results, and never throws for those cases. |
| `agent` | Role-separated Agent Orchestration above Tool Calling. `AgentRole` (`"planner" \| "executor" \| "reviewer"`), `AgentGoal` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`, `toolTimeoutMs`), `AgentPlanStep` / `AgentPlan`, `AgentStepResult` (wraps `ToolCallResult`), `AgentReviewDecision` / `AgentReviewResult`, `AgentExecutionStatus` / `AgentRunResult`, and the `AgentPlanner` / `AgentStepExecutor` / `AgentReviewer` / `AgentOrchestrator` ports define plan → execute → review without Memory, LLM freeform planning, multi-agent collaboration, or composition-root wiring. Concrete adapters are later tasks. |
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
  ai/ mcp/ tools/ agent/ application/
  api/ http/ server/
  composition/ config/
  evaluation/ observability/ reliability/ security/
  infra/
```
