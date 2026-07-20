# Project 2 Roadmap Status

> Status of AI Knowledge Platform Charter capabilities at Project 2
> Platform Baseline closeout (Sprint 20), plus post-baseline persistence,
> listen, AuthN, and LLM progress (Sprints 21–27).

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
| OpenSearch / real vector index adapter | Partial | `SqlVectorIndex` on SqlGateway validated (rebuildable search-index persistence); OpenSearch client still deferred |
| Real LLM provider SDK | Partial | `HttpLanguageModelProvider` + Fake transport validated; live optional via `LLM_API_KEY`; default composition remains Fake; official SDKs still deferred |
| MCP network transport | Deferred | In-process MCP ports only |
| `node:http` / Express TCP listen | Partial | `NodeHttpListener` + `createListeningOperationsServer` validated on 127.0.0.1 ephemeral; Express still not used; dispatch-only path retained |
| AuthN (JWT / OIDC) | Partial | API Key/`HttpBearerGuard` AuthN validated on cited-answer; JWT/OIDC still deferred |
| OpenTelemetry / Prometheus exporters | Deferred | `InMemoryLogger` / `InMemoryMetrics` only |

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
