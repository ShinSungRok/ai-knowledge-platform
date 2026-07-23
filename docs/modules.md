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
multi-agent collaboration, or composition-root wiring. Task 59 adds
`DeterministicKnowledgeAgentPlanner`, a no-dependency
`AgentPlanner` that validates `AgentGoal` and always emits a single
`generate_cited_grounded_answer` step with the goal's cited-answer
argument keys (byte-identical for identical inputs). Task 60 adds
`DefaultAgentStepExecutor` (injects only `ToolExecutor`; validates
step/`timeoutMs` then delegates to `execute`) and
`DefaultAgentReviewer` (no dependencies; approves only when step
counts match and every `toolCall.status` is `"success"`). Task 61 adds
`DefaultAgentOrchestrator` (injects only planner/stepExecutor/reviewer
ports; maps approved→completed, rejected+non-success→failed,
rejected+all-success→rejected; records thrown steps as failure and
stops remaining steps) and `RunAgentUseCase` (injects only
`AgentOrchestrator`; validates AgentGoal-shaped input then delegates).
Task 62 adds the `memory` module as a workspace/session-scoped Agent
Memory boundary — `MemoryEntryRole`, `MemoryEntry`, and the
`MemoryStore` port — separated from Knowledge document/chunk/vector
search. Memory does not replace Knowledge retrieval. `InMemoryMemoryStore` (Task 63) stores entries with deterministic
`id`=`${workspaceId}:${sessionId}:${sequence}` and sequence-ascending
`listBySession`, enforcing workspace isolation and defensive copies.
Task 64 adds `AppendMemoryEntryUseCase` and `RecallMemoryEntriesUseCase`
(injecting only `MemoryStore`; recall optional `limit` keeps newest N
entries in sequence-ascending order as a session memory window).
Task 65 adds `RunAgentWithMemoryUseCase` (injects only `MemoryStore` +
`AgentOrchestrator`): recall → append user → run agent → append fixed
agent summary; does not change planner/orchestrator adapters.
Task 66 adds the `jobs` module as a Background Job boundary —
`JobType`, `JobStatus`, `JobRecord`, and the `JobStore` / `JobHandler` /
`JobProcessor` ports — for Sync/Reindex pipeline work without real
workers, cron, or network brokers. `InMemoryJobStore` (Task 67) enqueues pending jobs with deterministic
`id`=`${workspaceId}:${sequence}`, list/get/save with workspace isolation
and defensive copies. Task 68 adds `SyncKnowledgeSourceJobHandler` (Sync pipeline only) and
`DefaultJobProcessor` (JobStore + handlers; pending→running→completed/
failed with retry). Task 69 adds `ReindexKnowledgeSourceJobHandler` (rechunk then reindex),
`EnqueueJobUseCase`, and `ProcessNextJobUseCase`. Tasks 70–85 add Evaluation,
Runtime, and Operations. Post-baseline Sprints 21–30 add Partial infra
adapters (`PostgresSqlGateway`, `OpenSearchVectorIndex`, HTTP LLM, MCP
JSON-RPC, `NodeHttpListener`, API Key AuthN, OTLP export) validated with
Fake/in-memory paths. Nested expansion Sprints 32–35 add Partial JWT
OIDC-lite, Prometheus `/metrics`, OTLP tracing, and MCP stdio — see
[`docs/progress/PROJECT02_ROADMAP_STATUS.md`](progress/PROJECT02_ROADMAP_STATUS.md)
and [`docs/portfolio.md`](portfolio.md).

## 2. Core modules

| Module | Responsibility |
|---|---|
| `domain` | Canonical types (`KnowledgeDocument`, `KnowledgeSource`, `DocumentChunk`), all workspace-scoped via `workspaceId`. Zero outward dependencies. |
| `application` | Use cases (list/page/create/update/delete/search/export for documents; create for sources; retrieve for chunks), each scoped to a `workspaceId`, over domain types and ports. `RetrieveKnowledgeChunksUseCase` depends only on the `VectorRetriever` port; `RetrieveHybridKnowledgeChunksUseCase` depends only on the `HybridSearch` port; `RetrieveGroundingContextUseCase` depends only on the `RerankedSearch` and `ContextAssembler` ports, delegating a reranked search and then a context assembly in sequence; `BuildGroundedPromptUseCase` depends only on `RetrieveGroundingContextUseCase` and the `PromptBuilder` port, delegating a grounding-context retrieval and then a prompt build in sequence; `GenerateGroundedTextUseCase` depends only on `BuildGroundedPromptUseCase` and the `LanguageModelProvider` port, delegating a grounded-prompt build and then an LLM generation call in sequence; `GenerateGroundedAnswerUseCase` depends on `RetrieveGroundingContextUseCase` plus `PromptBuilder`/`LanguageModelProvider`/`GroundedAnswerAssembler`, skipping prompt/generation when evidence is absent; `GenerateCitedGroundedAnswerUseCase` depends only on `GenerateGroundedAnswerUseCase` and `CitationBuilder`, returning `{ answer, citations }` unchanged; `InvokeMcpToolUseCase` depends only on the `McpToolRegistry` port, validating `{ name, arguments }` then delegating to `invoke`; `ExecuteToolCallUseCase` depends only on the `ToolExecutor` port, validating `{ name, arguments, timeoutMs }` then delegating to `execute`; `RunAgentUseCase` depends only on the `AgentOrchestrator` port, validating AgentGoal-shaped input then delegating to `run`; `AppendMemoryEntryUseCase` / `RecallMemoryEntriesUseCase` depend only on the `MemoryStore` port (recall `limit` is a session memory window, not Knowledge search); `RunAgentWithMemoryUseCase` depends only on `MemoryStore` + `AgentOrchestrator`, recalling before write and recording user/agent turns around an unchanged Agent run; `EnqueueJobUseCase` depends only on `JobStore`; `ProcessNextJobUseCase` depends only on `JobProcessor`; `RunRetrievalEvaluationUseCase` depends only on `RetrieveHybridKnowledgeChunksUseCase` and `RetrievalEvaluator`; `RunGroundingEvaluationUseCase` depends only on `GenerateGroundedAnswerUseCase` and `GroundingEvaluator`; `RunCitationEvaluationUseCase` depends only on `GenerateCitedGroundedAnswerUseCase` and `CitationEvaluator`. |
| `repository` | Persistence-agnostic ports (`KnowledgeDocumentRepository`, `KnowledgeSourceRepository`, `DocumentChunkRepository`); methods take `workspaceId` (chunk methods also take `documentId`; `findById` resolves by `id` alone, a workspace-global identity; `findAll` returns every workspace chunk in deterministic `documentId` → `order` → `id` order). |
| `persistence` | Concrete adapters (`DefaultInMemoryRepository`, `DefaultInMemoryKnowledgeSourceRepository`, `DefaultInMemoryDocumentChunkRepository`, `SqlKnowledgeDocumentRepository` / `SqlKnowledgeSourceRepository` / `SqlDocumentChunkRepository` over `SqlGateway`). Live `pg` is optional via `PostgresSqlGateway` + injected pool; default validate stays Fake/`InMemorySqlGateway`. |
| `pipeline` | Ingestion pipelines from external knowledge sources. `KnowledgeSourceConnector` port + `FakeKnowledgeSourceConnector` fixture adapter fetch normalized documents (`externalId`/`title`/`text`) for a `KnowledgeSource`; `SyncKnowledgeSourcePipeline` turns those into idempotent, deterministically-keyed `KnowledgeDocument` writes via the repository ports (legacy path preserved). Sync change-set / lifecycle contracts plus `KnowledgeSourceChangeDetector` / `KnowledgeSourceReconciler` ports support production sync hardening; `DefaultKnowledgeSourceChangeDetector` classifies added/updated/unchanged/removed; `DefaultKnowledgeSourceReconciler` deletes removed documents' vectors/chunks/documents; `ReconcilingSyncKnowledgeSourcePipeline` orchestrates detect → upsert → reconcile and returns `SyncLifecycleResult`. `ChunkKnowledgeDocumentPipeline` chunks a single stored document via `ChunkingService` and fully replaces its chunk set via `DocumentChunkRepository`; `RechunkKnowledgeSourcePipeline` re-chunks every document of one source by delegating each to `ChunkKnowledgeDocumentPipeline`. `EmbedDocumentChunksPipeline` embeds one document's chunks via `EmbeddingProvider` and upserts one vector per chunk into `VectorIndex`, validating the whole result set before any write; `ReindexKnowledgeSourceEmbeddingsPipeline` re-embeds every document of one source by delegating each to `EmbedDocumentChunksPipeline`. No automatic chunking/embedding during sync, background scheduling, or real connector yet. |
| `embedding` | Chunking, embedding, and vector indexing. Default `VectorIndex`: `InMemoryVectorIndex` / `SqlVectorIndex`. Optional `OpenSearchVectorIndex` over `OpenSearchHttpTransport` (Fake/Fetch; official OpenSearch JS SDK deferred). |
| `retrieval` | `VectorRetriever` port + `DefaultVectorRetriever` adapter turn a `RetrievalInput` (`workspaceId`, `query`, `limit`) into a `RetrievalResult` (`query`, ranked `RetrievedChunk[]`) by embedding the query via `EmbeddingProvider`, ranking via `VectorIndex.findNearest`, and hydrating each result to its `DocumentChunk` via `DocumentChunkRepository.findById` — excluding stale results. Keyword/hybrid retrieval, re-ranking, and context assembly are handled by `search`/`context`. |
| `search` | Search engine abstraction (keyword, vector, hybrid, re-ranking). `KeywordSearch` port + `DefaultKeywordSearch` adapter turn a `RetrievalInput` into a `RetrievalResult` by loading every chunk in the workspace via `DocumentChunkRepository.findAll`, tokenizing query/chunk text into lowercased Unicode letter/number tokens, and scoring by summed exact match counts of the query's de-duplicated tokens. `HybridSearch` port + `DefaultHybridSearch` adapter wire only `VectorRetriever` and `KeywordSearch`, running both with the same `RetrievalInput` and fusing their results by chunk id via reciprocal-rank fusion (`1 / (60 + rank)` per source, summed for chunks found by both). `RerankingInput` (`workspaceId`, `query`, `chunks: RetrievedChunk[]`) + the `Reranker` port (`rerank(input): Promise<RetrievedChunk[]>`) define how a candidate set is deterministically re-ordered by query relevance. `DefaultReranker` (no constructor dependency) scores each candidate as unique query-token coverage + token density + its own original retrieved score (over the same shared `tokenize` utility `DefaultKeywordSearch` uses), sorted by that score descending then chunk id ascending, returning every candidate as fresh, unmutated objects. `RerankedSearch` port + `DefaultRerankedSearch` adapter wire only `HybridSearch` and `Reranker`: it validates a `RetrievalInput`, calls `HybridSearch.search`, passes that result's chunks to `Reranker.rerank({ workspaceId, query, chunks })`, and returns the reranker's own chunk order as its `RetrievalResult` unchanged. |
| `context` | Prompt context assembly from retrieved documents. `ContextAssemblyInput` (`workspaceId`, `query`, ranked `RetrievedChunk[]`, `maxCharacters`) + `GroundingContext` (`query`, ordered `GroundingContextBlock[]`, rendered `content`, `truncated`) define the `ContextAssembler` port's `assemble` contract. `DefaultContextAssembler` (its default adapter) depends only on `KnowledgeDocumentRepository`, hydrating each ranked chunk's document provenance in the given order, rendering each as `[sourceId=...;documentId=...;chunkId=...]\n<chunk text>` joined by a blank line, including a block only if it fits the remaining `maxCharacters` budget whole, and skipping (never truncating) an oversized or stale-document candidate while still evaluating later chunks. Prompt Builder and Citation live in sibling modules (`prompt` / `citation`). |
| `prompt` | Prompt construction from a `GroundingContext`. `GroundedPrompt` (`systemInstruction`, `userMessage`, both plain strings) + the `PromptBuilder` port (`build(context: GroundingContext): Promise<GroundedPrompt>`) define an LLM-independent prompt representation. `DefaultPromptBuilder` (no constructor dependency) renders a fixed `systemInstruction` and a fixed `Question:\n<query>\n\nGrounding context status: <complete\|truncated>\n\nGrounding context:\n<content\|[none]>` `userMessage`, using `content` verbatim and never calling or constructing an LLM provider. |
| `citation` | Citation building from grounded-answer evidence. `Citation` (`id`, `sourceId`, `documentId`, `chunkId`, `score`, `excerpt`) + `CitedGroundedAnswer` (`answer: GroundedAnswer`, `citations: Citation[]`) + the `CitationBuilder` port (`build(answer): Promise<Citation[]>`) define an explicit contract for converting `GroundedAnswer.evidence` into deterministic citations — this is where the evidence-only citation policy lives (never fabricating a citation outside evidence). `DefaultCitationBuilder` (no constructor dependency) emits exactly one citation per evidence block in order, with `id` = `cite:${encodeURIComponent(sourceId)}:${encodeURIComponent(documentId)}:${encodeURIComponent(chunkId)}`, copied provenance, and `excerpt` = block `text` (no truncation); empty evidence → empty citation list. |
| `rag` | RAG answer assembly (answer + citations). `GroundedAnswer` (`text`, `evidence: GroundingContextBlock[]`, `insufficientEvidence`) + `GroundedAnswerAssemblyInput` (`context: GroundingContext`, `generatedText: GeneratedText`) + the `GroundedAnswerAssembler` port (`assemble(input): Promise<GroundedAnswer>`) define an explicit contract for combining generated text with grounding evidence — this is where insufficient-evidence policy lives, never in `PromptBuilder`/`LanguageModelProvider`. `DefaultGroundedAnswerAssembler` (no constructor dependency) discards generated text and returns a fixed insufficient-evidence message when `context.blocks` is empty, otherwise returns `generatedText.text` plus a defensive copy of `context.blocks` as evidence — truncation alone is never treated as evidence absence. |
| `ai` | AI provider abstraction (fake + real providers). `GeneratedText` + `LanguageModelProvider` define provider-independent generation from `GroundedPrompt`. `FakeLanguageModelProvider` echoes `userMessage` for dependency-free validation. `LlmHttpProviderConfig` / `LlmHttpTransport` and `HttpLanguageModelProvider` implement OpenAI-compatible chat completions over an injected transport (no official SDK; default composition still uses Fake). |
| `mcp` | Transport-independent MCP tool registry plus JSON-RPC handler and HTTP + stdio transport boundaries. `McpTool` / `McpToolRegistry` expose capabilities without Domain/RAG duplication. `McpJsonRpcHandler` / `DefaultMcpJsonRpcHandler` map `tools/list`·`tools/call` onto the registry. `StdioMcpJsonRpcSession` provides newline-delimited stdio (Fake/Node adapters; no Bearer). Official MCP SDK deferred. |
| `tools` | Transport-independent Tool Calling boundary above MCP capability exposure. `ToolCallStatus` (`"success" \| "invalid_request" \| "unknown_tool" \| "timeout" \| "failure"`), `ToolCallRequest` (`name`, `arguments`, `timeoutMs`), `ToolCallResult` (`ok`, `status`, `toolName`, optional `result`/`error`, `durationMs`), and the `ToolExecutor` port (`execute(request): Promise<ToolCallResult>`) define validated tool-call request/result contracts without an MCP SDK, network transport, or Agent orchestrator. `DefaultToolExecutor` injects only `McpToolRegistry`, maps MCP success/unknown-tool/failure results onto ToolCall statuses, races invoke against `timeoutMs` for structured `timeout` results, and never throws for those cases. |
| `agent` | Role-separated Agent Orchestration above Tool Calling. `AgentRole` (`"planner" \| "executor" \| "reviewer"`), `AgentGoal` (`workspaceId`, `query`, `retrievalLimit`, `maxCharacters`, `toolTimeoutMs`), `AgentPlanStep` / `AgentPlan`, `AgentStepResult` (wraps `ToolCallResult`), `AgentReviewDecision` / `AgentReviewResult`, `AgentExecutionStatus` / `AgentRunResult`, and the `AgentPlanner` / `AgentStepExecutor` / `AgentReviewer` / `AgentOrchestrator` ports define plan → execute → review without Memory, LLM freeform planning, multi-agent collaboration, or composition-root wiring. `DeterministicKnowledgeAgentPlanner` (no constructor dependency) validates `AgentGoal` and always returns a single-step plan for `generate_cited_grounded_answer` with `{ workspaceId, query, retrievalLimit, maxCharacters }`. `DefaultAgentStepExecutor` injects only `ToolExecutor` and wraps its unchanged `ToolCallResult`. `DefaultAgentReviewer` (no constructor dependency) approves only when step counts match and every tool call status is `"success"`. `DefaultAgentOrchestrator` injects only the three role ports, runs plan→execute→review, maps status (`completed`/`failed`/`rejected`), and converts thrown steps into `status: "failure"` results without continuing remaining steps. |
| `workflow` | Multi-Agent role/identity + Orchestrator + Handoff + Shared Workflow Memory + Evaluation (Project 3). `WorkflowAgent` remains identity-only. `WorkflowMemoryStore` records objective/handoff/step_output per run. `WorkflowRunEvaluator` / `DefaultWorkflowRunEvaluator` + `RunWorkflowEvaluationUseCase` score run/memory artifacts (no LLM-as-judge). Distinct from Project 2 session `MemoryStore` and RAG `evaluation`. |
| `memory` | Workspace/session-scoped Agent Memory, separated from Knowledge search. `MemoryEntryRole` (`"user" \| "agent" \| "system"`), `MemoryEntry` (`id`, `workspaceId`, `sessionId`, `role`, `content`, `sequence`), and the `MemoryStore` port (`append` / `listBySession`) define conversational turn storage for Agent runs. Memory does **not** replace Knowledge document/chunk/vector/hybrid search. `InMemoryMemoryStore` assigns 1-based per-session `sequence`, deterministic `id` (`${workspaceId}:${sessionId}:${sequence}`), returns sequence-ascending lists, enforces workspace isolation, and defensive-copies on read/write. `AppendMemoryEntryUseCase` / `RecallMemoryEntriesUseCase` (application) inject only `MemoryStore`; recall optional `limit` returns newest N entries ascending. |
| `jobs` | Background Job boundary for long-running Sync/Reindex pipeline work. `JobType` (`"sync_knowledge_source" \| "reindex_knowledge_source"`), `JobStatus` (`"pending" \| "running" \| "completed" \| "failed"`), `JobRecord`, and the `JobStore` / `JobHandler` / `JobProcessor` ports define enqueue/process contracts without real workers, cron, or network brokers. `InMemoryJobStore` assigns 1-based workspace `sequence`, deterministic `id` (`${workspaceId}:${sequence}`), pending enqueue, get/list/save with workspace isolation and defensive copies. `SyncKnowledgeSourceJobHandler` runs `ReconcilingSyncKnowledgeSourcePipeline` and returns lifecycle summary counts; `DefaultJobProcessor` processes oldest pending job with retry/failure rules. `ReindexKnowledgeSourceJobHandler` runs rechunk then reindex; `EnqueueJobUseCase` / `ProcessNextJobUseCase` (application) inject only JobStore / JobProcessor. |
| `llmops` | Project 4 Enterprise LLMOps boundary. Experiment / Run Tracking, Prompt & Model Registry, Evaluation Gates / Regression Harness, Deployment / Serving Configuration (InMemory stores + validators). LLMOps Observability: `LlmopsObservationStore` + `InMemoryLlmopsObservationStore` (`DefaultLlmopsObservationStore` alias) for quality/cost/latency — requires at least one signal, soft-link run/serving ids, ordered lists, defensive copies; does not import `observability`. Soft-map names for later Metrics/OTLP: `llmops.quality.<key>`, `llmops.cost.units`, `llmops.latency.ms`. Distinct from Project 2 `JobStore` and Project 3 `WorkflowRunId`. HTTP serving and `@opentelemetry/*` remain deferred; does not bind `ai` LanguageModelProvider. |
| `api` | Controllers and request/response DTOs. `HealthController` (`GET /health`, no auth), `CitedGroundedAnswerController` (Bearer + workspace AuthZ), and `McpJsonRpcController` (`POST /mcp` JSON-RPC with Bearer AuthN; tools/call workspace match). `createKnowledgeHttpRouter` registers HTTP routes; protected routes require `Authorization: Bearer <api-key>`. |
| `http` | Framework-independent HTTP abstraction: `HttpMethod`/`HttpRequest`/`HttpResponse`, `HttpHandler`/`HttpRouter` ports, and `DefaultHttpRouter` (exact method+path match; JSON 404 on miss). `ObservingHttpRouter` adds logger/metrics, optional `Tracer` HTTP spans, and dependency-free Prometheus `GET /metrics`. No Express/Fastify; TCP listen lives in `server` (`NodeHttpListener`). |
| `server` | Production server runtime and lifecycle. `KnowledgeServer` / `DefaultKnowledgeServer` provide start/stop/isRunning/dispatch over an injected `HttpRouter` without TCP listen. `HttpListener` / `HttpListenConfig` / `HttpListenAddress` define a TCP listen adapter contract; `NodeHttpListener` implements it with built-in `node:http` (no Express/Fastify). `createInMemoryKnowledgeServer` (composition) wires in-memory composition → HTTP router → dispatch-only server. |
| `composition` | Composition root — wires concrete adapters. In-memory cited-answer + MCP registry/handler; operations/listening expose Bearer-protected HTTP including `POST /mcp`. Optional OTLP (logs/metrics/traces) when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Optional JWT AuthN via `auth` (`AuthProviderOption`); default ApiKey. Optional local MCP stdio via `createInMemoryStdioMcpSession` (HTTP `/mcp` remains default network path). SQL/Postgres SoT paths use `SqlVectorIndex` by default; optional `createOpenSearchKnowledgeComposition` keeps SQL SoT and swaps VectorIndex to OpenSearch (Fake/Fetch). |
| `config` | Typed, validated runtime configuration. `KnowledgeRuntimeConfig` (positive-integer defaults for retrieval limit, max characters, tool timeout, max chunk length), `loadKnowledgeRuntimeConfig` plain-object loader with defensive copy, and `DEFAULT_KNOWLEDGE_RUNTIME_CONFIG`. No `process.env`/dotenv parsing. |

## 3. Cross-cutting modules

| Module | Responsibility |
|---|---|
| `evaluation` | Knowledge Quality Evaluation. `EvaluationCase` / `EvaluationDataset`, retrieval/grounding/citation case scores and aggregate metrics, `EvaluationReport`, and the `RetrievalEvaluator` / `GroundingEvaluator` / `CitationEvaluator` ports define dependency-free scoring contracts over `RetrievalResult`, `GroundedAnswer`, and `CitedGroundedAnswer`. `DefaultRetrievalEvaluator` computes Hit@K / MRR; `DefaultGroundingEvaluator` scores insufficient-evidence compliance; `RunRetrievalEvaluationUseCase` / `RunGroundingEvaluationUseCase` (application) run hybrid retrieve or grounded-answer generation then delegate to evaluator ports. `DefaultCitationEvaluator` scores evidence-bound citation correctness; `RunCitationEvaluationUseCase` runs cited-answer generation then delegates. No real benchmark corpus loader or LLM-as-judge. |
| `observability` | Logging, metrics, tracing, and OTLP/HTTP export boundary. `InMemoryLogger`/`InMemoryMetrics`/`InMemoryTracer` remain the default sinks. `OtlpLogsExporter`/`OtlpMetricsExporter`/`OtlpTracesExporter` plus Exporting adapters and `FetchOtlpHttpTransport` enable optional collector export without official OpenTelemetry SDK. Full W3C propagator suite deferred. |
| `reliability` | Retry, timeout, circuit breaker, error classification. `RetryPolicy`/`DefaultRetryPolicy` (no-delay retries) and `TimeoutPolicy`/`DefaultTimeoutPolicy` (`Promise.race` + `setTimeout`). Circuit breaker and tools/jobs/HTTP wiring remain out of scope. |
| `security` | Authentication and workspace authorization. `Authenticator` / `AuthPrincipal` define AuthN; `ApiKeyAuthenticator` maps static API keys; `HttpBearerGuard` parses `Authorization: Bearer`. `JwtVerifier` / `loadJwtAuthConfig` define dependency-free JWT verification (no jsonwebtoken/jose/passport SDK). `WorkspaceAuthorizer`/`DefaultWorkspaceAuthorizer` and `HttpWorkspaceGuard` (`x-workspace-id`) enforce AuthZ. Health stays unauthenticated. Full OIDC login flows remain deferred. |
| `infra` | Infrastructure edge for Source-of-Truth persistence and Docker scaffolding. `SqlGateway` / `SqlParameter` / `SqlQueryResult` define the SQL execute contract. `knowledgeSchemaSql` + `applyKnowledgeSchema` apply CREATE TABLE IF NOT EXISTS for sources/documents/chunks plus `embedding_vectors` (rebuildable search index; optional OpenSearch VectorIndex is separate). `InMemorySqlGateway` validates repository SQL (DDL no-op) without a live DB. `PostgresSqlGateway` adapts a `PostgresPool` (`pg.Pool`-compatible); default validate does not open connections. Local Docker helpers via `pnpm infra:config`. |

## 4. Top-level shape

```
app/knowledge/
  domain/
  repository/ persistence/ pipeline/
  embedding/ search/ retrieval/
  context/ prompt/ citation/ rag/
  ai/ mcp/ tools/ agent/ workflow/ memory/ jobs/ llmops/ application/
  api/ http/ server/
  composition/ config/
  evaluation/ observability/ reliability/ security/
  infra/
```
