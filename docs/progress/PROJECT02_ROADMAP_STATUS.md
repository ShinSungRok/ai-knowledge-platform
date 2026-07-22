# Project 2 Roadmap Status

> Status of AI Knowledge Platform Charter capabilities at Project 2
> Platform Baseline closeout (Sprint 20), plus post-baseline persistence,
> listen, AuthN, LLM, MCP transport, OTLP export, and OpenSearch vector
> adapter progress (Sprints 21–30).

## Post-baseline Infrastructure Track: CLOSED (Partial)

Sprints 21–30 delivered Fake-/in-memory-validated **Partial** adapters for
Postgres SoT, OpenSearch VectorIndex, HTTP LLM, MCP JSON-RPC HTTP, TCP listen,
API Key/Bearer AuthN, and OTLP/HTTP export. Default `pnpm validate` stays
dependency-free.

**Remaining nested deferrals (by design):** official SDKs (`@opentelemetry/*`,
OpenSearch JS, LLM vendor SDKs, MCP SDK), MCP stdio, Express/Fastify,
full OIDC login flows / JWT-OIDC SDKs, distributed tracing.

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
| MCP network transport | Partial | JSON-RPC HTTP `POST /mcp` (`tools/list`·`tools/call`) validated with Bearer AuthN; official MCP SDK / stdio still deferred |
| `node:http` / Express TCP listen | Partial | `NodeHttpListener` + `createListeningOperationsServer` validated on 127.0.0.1 ephemeral; Express still not used; dispatch-only path retained |
| AuthN (JWT / OIDC) | Partial | API Key + optional JWT HS256 / JWKS RS256 OIDC-lite validated (`Hs256JwtAuthenticator`, `Rs256JwtAuthenticator`, Fake JWKS); default operations/listening remain ApiKey; full OIDC login flows and official JWT/OIDC SDKs still deferred |
| OpenTelemetry / Prometheus exporters | Partial | OTLP/HTTP log+metrics export validated with Fake transport; optional composition via `OTEL_EXPORTER_OTLP_ENDPOINT`; dependency-free Prometheus text scrape at `GET /metrics` (`ObservingHttpRouter` + `toPrometheusText`); official OTel SDK / tracing still deferred |

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
