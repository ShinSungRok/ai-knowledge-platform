# Project 2 Roadmap Status

## Project 2: CLOSED

**Project 2: CLOSED.** Active Project 2 charter work in this repository is
complete. Handoff is to **Project 3 — Enterprise AI Workflow — Multi-Agent**.

| Milestone | Status | Sprint |
|---|---|---|
| Charter Platform Baseline | CLOSED (capabilities Completed) | Sprint 20 |
| Post-baseline Infrastructure Track | CLOSED (Partial) | Sprint 31 |
| Nested Deferral Expansion Track | CLOSED (Partial) | Sprint 36 |
| Project 2 final closeout / Project 3 handoff | CLOSED | Sprint 37 |

**Remaining by design (once):** official SDKs (`@opentelemetry/*`, OpenSearch JS,
LLM vendor SDKs, MCP SDK), Express/Fastify, full OIDC login flows / JWT-OIDC
SDKs, full W3C propagator suite / `prom-client`.

**Next:** Project 3 Enterprise AI Workflow — Multi-Agent (out of this repo’s
active Project 2 charter). Partial adapters stay Partial — not Completed.
**Project 3 active docs:** `docs/agent/PROJECT03_INSTRUCTIONS.md`,
`docs/progress/PROJECT03_PROGRESS.md`, `docs/progress/PROJECT03_ROADMAP_STATUS.md`.

## P2 Service Completion Track: Active — Phase B

**Human-authorized** additional Active track (does **not** reopen Project 2
charter baseline CLOSED or promote Partial infra to Completed).

| Item | Status |
|---|---|
| Track | **Active — Phase B** |
| Phase A | **Complete** (Sprint 57: `pnpm start`, `seedDemoKnowledge`, `pnpm validate:server:start-smoke`) |
| Phase B (Sprint 58) | Optional HTTP LLM when `LLM_API_KEY` is set; Fake LLM default |
| Phase B (Sprint 59) | Optional Postgres SoT when `DATABASE_URL` is set; InMemory default; FakePostgres listen smoke in `pnpm validate` |
| Later Phase B | OpenSearch listening wiring (not this Sprint) |
| Stack | InMemory default + optional Postgres; `NodeHttpListener` (no Express); Fake LLM default |
| Frozen | Project 3 / Project 4 product work; Express/Fastify; Partial→Completed |
| Progress Log | `docs/progress/PROJECT02_PROGRESS.md` from Task 219+ |

Sprint 57 (Task 219–222) completed Phase A. Sprint 58 (Task 223–226) added
optional HTTP LLM (`LLM_API_KEY`; Fake default). Sprint 59 (Task 227–230)
added optional Postgres SoT on host (`DATABASE_URL`; InMemory default;
`validate:server:start-postgres-smoke` in top-level validate;
`validate:server:start-postgres-live` optional skip). OpenSearch listening
wiring remains later Phase B. Do not invent Project 5. P3/P4 remain
CLOSED (Partial) / CLOSED (Partial) and frozen for this track.

> Historical track detail below: Platform Baseline closeout (Sprint 20),
> post-baseline persistence / listen / AuthN / LLM / MCP / OTLP / OpenSearch
> (Sprints 21–30), nested deferral expansion (Sprints 32–35).

## Nested Deferral Expansion Track: CLOSED (Partial)

Sprints 32–35 delivered Fake-/in-memory-validated **Partial** paths for
JWT/OIDC-lite AuthN, Prometheus `GET /metrics` scrape, OTLP/HTTP tracing
spans, and MCP stdio newline JSON-RPC. Default `pnpm validate` stays
dependency-free; HTTP `/mcp` remains the default network path; default
operations AuthN remains ApiKey.

**Remaining by design:** official SDKs (`@opentelemetry/*`, OpenSearch JS,
LLM vendor SDKs, MCP SDK), Express/Fastify, full OIDC login flows /
JWT-OIDC SDKs, full W3C propagator suite / `prom-client`.

**Charter Platform Baseline remains CLOSED** (Sprint 20).
**Post-baseline Infrastructure Track remains CLOSED (Partial)** (Sprint 31).
This track closeout does not reopen those tracks or mark Partial adapters
as Completed.

## Post-baseline Infrastructure Track: CLOSED (Partial)

Sprints 21–30 delivered Fake-/in-memory-validated **Partial** adapters for
Postgres SoT, OpenSearch VectorIndex, HTTP LLM, MCP JSON-RPC HTTP, TCP listen,
API Key/Bearer AuthN, and OTLP/HTTP export. Default `pnpm validate` stays
dependency-free.

**Remaining nested deferrals (by design):** official SDKs (`@opentelemetry/*`,
OpenSearch JS, LLM vendor SDKs, MCP SDK), Express/Fastify,
full OIDC login flows / JWT-OIDC SDKs, full W3C propagator suite.

**Charter Platform Baseline remains CLOSED** (Sprint 20). This track closeout
does not reopen baseline capabilities or mark Partial adapters as Completed.

## Charter capability → Completed

| Charter capability | Status | Evidence (representative) |
|---|---|---|
| Workspace isolation | Completed | Workspace-scoped repositories and use cases |
| Knowledge Source / Connector / Sync+Reconcile | Completed | Connector, sync, change detector, reconciler, reconciling sync |
| Chunk / Embedding / Vector | Completed | Chunker, fake embedding, vector index, embed/reindex pipelines |
| Hybrid + Rerank retrieval | Completed | Keyword, hybrid RRF, reranker, grounding context |
| Prompt / LLM / Grounding / Citation | Completed | Prompt builder, fake LLM, grounded/cited answer use cases |
| MCP / Tool Calling / Agent / Memory | Completed | MCP registry, tool executor, agent orchestrator, memory store |
| Background Jobs | Completed | Job store/processor, sync + reindex handlers |
| Evaluation | Completed | Retrieval / grounding / citation evaluators + run use cases |
| Runtime | Completed | Config, in-memory composition, HTTP/API, server lifecycle |
| Operations | Completed | Logger/metrics, retry/timeout, workspace guard, observing router, deployment readiness |

## Deferred infrastructure

| Item | Status | Notes |
|---|---|---|
| Postgres source-of-truth adapter | Partial | `PostgresSqlGateway` + schema/composition validated with Fake pool; live DB optional via `DATABASE_URL`; default validate still `InMemorySqlGateway`/Fake |
| OpenSearch / real vector index adapter | Partial | `OpenSearchVectorIndex` + Fake HTTP transport validated; live optional via `OPENSEARCH_URL`; official OpenSearch SDK still deferred; default composition remains InMemory/`SqlVectorIndex` |
| Real LLM provider SDK | Partial | `HttpLanguageModelProvider` + Fake transport validated; live optional via `LLM_API_KEY`; default composition remains Fake; official SDKs still deferred |
| MCP network transport | Partial | JSON-RPC HTTP `POST /mcp` (`tools/list`·`tools/call`) with Bearer AuthN, plus newline-delimited stdio session (`StdioMcpJsonRpcSession`, Fake streams validated); HTTP remains the default network path; official MCP SDK still deferred |
| `node:http` / Express TCP listen | Partial | `NodeHttpListener` + `createListeningOperationsServer` validated on 127.0.0.1 ephemeral; Express still not used; dispatch-only path retained |
| AuthN (JWT / OIDC) | Partial | API Key + optional JWT HS256 / JWKS RS256 OIDC-lite validated (`Hs256JwtAuthenticator`, `Rs256JwtAuthenticator`, Fake JWKS); default operations/listening remain ApiKey; full OIDC login flows and official JWT/OIDC SDKs still deferred |
| OpenTelemetry / Prometheus exporters | Partial | OTLP/HTTP log+metrics+traces export validated with Fake transport; optional composition via `OTEL_EXPORTER_OTLP_ENDPOINT` (`ExportingTracer`, ObservingHttpRouter HTTP spans, minimal `traceparent`); dependency-free Prometheus text scrape at `GET /metrics`; official OTel SDK / full W3C propagator suite still deferred |

## Task range

| Range | Scope |
|---|---|
| Task 1–85 | Product/platform capability implementation (Sprints through Establish Operations) |
| Sprint 20 (Task 86–89) | Project 2 Platform Baseline **closeout** (docs + static validation only) |
| Sprint 21 (Task 90–93) | Post-baseline Source-of-Truth Persistence (`SqlGateway`, SQL document repository, InMemorySqlGateway, SQL composition path) |
| Sprint 22 (Task 94–97) | Extend SoT Persistence to Source and Chunk (SQL source/chunk adapters, gateway support, full SQL knowledge composition) |
| Sprint 23 (Task 98–101) | Establish Postgres SqlGateway Driver (schema helper, `PostgresSqlGateway`, Fake pool validation, postgres composition factory) |
| Sprint 24 (Task 102–105) | Establish SQL Vector Index Persistence (`embedding_vectors`, `SqlVectorIndex`, gateway support, SQL/Postgres composition wiring) |
| Sprint 25 (Task 106–109) | Establish HTTP TCP Listen (`HttpListener`, `NodeHttpListener`, ephemeral validation, listening operations factory) |
| Sprint 26 (Task 110–113) | Establish HTTP Authentication (AuthN contract, API Key + Bearer guard, cited-answer wiring, listening/operations `apiKeys`) |
| Sprint 27 (Task 114–117) | Establish Real LLM Provider (HTTP contract, HttpLanguageModelProvider, Fake/live validation, optional composition wiring; default Fake) |
| Sprint 28 (Task 118–121) | Establish MCP Network Transport (JSON-RPC contract/handler, HTTP `/mcp`, listening/operations wiring; SDK/stdio deferred) |
| Sprint 29 (Task 122–125) | Establish OpenTelemetry Export (OTLP/HTTP contract/exporters, ExportingLogger/Metrics, optional env composition; official SDK deferred) |
| Sprint 30 (Task 126–129) | Establish OpenSearch Vector Index Adapter (HTTP contract, `OpenSearchVectorIndex`, Fake validation, optional composition; official SDK deferred; default InMemory/`SqlVectorIndex`) |
| Sprint 31 (Task 130–133) | Close Out Post-baseline Infrastructure Track (portfolio/README/deployment alignment, `validate:project:post-baseline-closeout`, roadmap track CLOSED Partial) |
| Sprint 32 (Task 134–137) | Establish JWT/OIDC Authentication (JWT contract/verifiers, HS256 + JWKS RS256, optional composition `auth`; default ApiKey; official SDK/login flows deferred) |
| Sprint 33 (Task 138–141) | Establish Prometheus `/metrics` Scrape Endpoint (`toPrometheusText`, `ObservingHttpRouter` GET `/metrics`, scrape validation; `prom-client` / tracing deferred) |
| Sprint 34 (Task 142–145) | Establish Distributed Tracing (OTLP Spans) (`Tracer`/`Span`, `InMemoryTracer`, `OtlpTracesExporter`, ObservingHttpRouter instrumentation, optional OTEL composition; official SDK / full propagator suite deferred) |
| Sprint 35 (Task 146–149) | Establish MCP Stdio Transport (stdio IO contract, `StdioMcpJsonRpcSession`, Fake streams validation, optional `createInMemoryStdioMcpSession`; HTTP `/mcp` remains default network path; official MCP SDK deferred) |
| Sprint 36 (Task 150–153) | Close Out Nested Deferral Expansion Track (portfolio/ops docs alignment, `validate:project:nested-expansion-closeout`, roadmap track CLOSED Partial) |
| Sprint 37 (Task 154–157) | Close Out Project 2 / Project 3 Handoff (portfolio Project 2 CLOSED + Multi-Agent handoff, `validate:project:final-closeout`, roadmap Project 2: CLOSED) |
| Sprint 57 (Task 219–222) | P2 Service Completion Phase A (`pnpm start`, demo seed, start smoke; human-authorized; P3/P4 frozen) |
| Sprint 58 (Task 223–226) | Phase A Complete + Phase B optional HTTP LLM (`LLM_API_KEY`; Fake default; P3/P4 frozen) |
| Sprint 59 (Task 227–230) | Phase B optional Postgres SoT on host (`DATABASE_URL`; FakePostgres smoke; live optional; P3/P4 frozen) |
