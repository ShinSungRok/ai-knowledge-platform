# Project 2 Roadmap Status

> Status of AI Knowledge Platform Charter capabilities at Project 2
> Platform Baseline closeout (Sprint 20), plus post-baseline persistence
> progress (Sprint 21).

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
| Postgres source-of-truth adapter | Partial | SQL gateway + `SqlKnowledgeDocumentRepository` (`InMemorySqlGateway` validated); real `pg` driver still deferred |
| OpenSearch / real vector index adapter | Deferred | `InMemoryVectorIndex` only |
| Real LLM provider SDK | Deferred | `FakeLanguageModelProvider` only |
| MCP network transport | Deferred | In-process MCP ports only |
| `node:http` / Express TCP listen | Deferred | In-process `dispatch` only |
| AuthN (JWT / OIDC) | Deferred | Workspace header guard only |
| OpenTelemetry / Prometheus exporters | Deferred | `InMemoryLogger` / `InMemoryMetrics` only |

## Task range

| Range | Scope |
|---|---|
| Task 1–85 | Product/platform capability implementation (Sprints through Establish Operations) |
| Sprint 20 (Task 86–89) | Project 2 Platform Baseline **closeout** (docs + static validation only) |
| Sprint 21 (Task 90–93) | Post-baseline Source-of-Truth Persistence (`SqlGateway`, SQL document repository, InMemorySqlGateway, SQL composition path) |
