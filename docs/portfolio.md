# Portfolio / Project Intent

## 1. What this is

**AI Knowledge Platform** is a production-shaped TypeScript backend for
knowledge retrieval and grounded question answering. It inherits the Clean /
Hexagonal / DDD architecture philosophy proven in Project1 (`public-law-ai`),
generalized beyond a single legal domain.

Project 2 delivers a **completed platform baseline**: workspace-scoped
knowledge pipelines through cited RAG answers, MCP/tool/agent/memory/jobs,
evaluation, in-process runtime, and operations foundations — all proven by
dependency-free validation runners against fake/in-memory adapters.

Post-baseline Sprints 21–30 add **Partial** infrastructure adapters (Fake-
validated; live optional via env). Those do not reopen or replace the Charter
Platform Baseline closeout (Sprint 20).

## 2. Capabilities Project 2 proves (Charter order)

| Capability | What is proven |
|---|---|
| Workspace isolation | Every knowledge path is scoped by `workspaceId`; cross-workspace access is blocked |
| Knowledge Source / Connector / Sync+Reconcile | Source registry, connector port, sync + change-detect + reconcile pipelines |
| Chunk / Embedding / Vector | Deterministic chunking, fake embedding, in-memory vector index, embed/reindex pipelines |
| Hybrid + Rerank retrieval | Keyword, vector, RRF hybrid, deterministic rerank, grounding context assembly |
| Prompt / LLM / Grounding / Citation | Grounded prompts, fake LLM, insufficient-evidence policy, evidence-bound citations |
| MCP / Tool Calling / Agent / Memory | MCP tool registry, tool executor, planner→execute→review agent, session memory |
| Background Jobs | Job store/processor with sync and reindex handlers |
| Evaluation | Retrieval / grounding / citation evaluators and run use cases |
| Runtime | Runtime config, in-memory composition, framework-independent HTTP/API, server lifecycle; post-baseline optional TCP via `NodeHttpListener` |
| Operations | Logger/metrics, retry/timeout policies, workspace HTTP guard, observing router, deployment readiness |

## 3. Post-baseline infrastructure (Partial)

Sprints 21–30 delivered Fake-/in-memory-validated Partial adapters. Default
`pnpm validate` stays dependency-free. Live clusters/keys remain optional.

| Area | Partial evidence |
|---|---|
| Postgres SoT | `PostgresSqlGateway` + Fake pool; live `DATABASE_URL` optional; default `InMemorySqlGateway` |
| OpenSearch vector | `OpenSearchVectorIndex` + Fake HTTP transport; live `OPENSEARCH_URL` optional; default InMemory/`SqlVectorIndex` |
| Real LLM HTTP | `HttpLanguageModelProvider` + Fake transport; live `LLM_API_KEY` optional; default Fake |
| MCP network | JSON-RPC HTTP `POST /mcp` (`tools/list`·`tools/call`); official MCP SDK deferred |
| MCP stdio | Newline-delimited JSON-RPC via `StdioMcpJsonRpcSession` + Fake streams; `createInMemoryStdioMcpSession`; HTTP `/mcp` remains default network path; official MCP SDK deferred |
| TCP listen | `NodeHttpListener` + listening operations (`createListeningOperationsServer`); Express unused |
| AuthN | API Key / Bearer; optional JWT HS256 + JWKS/RS256 OIDC-lite (`Hs256JwtAuthenticator`, `Rs256JwtAuthenticator`); default operations ApiKey; full OIDC login/SDK deferred |
| OTLP export | OTLP/HTTP log+metrics+traces via Fake transport; optional `OTEL_EXPORTER_OTLP_ENDPOINT`; official OTel SDK deferred |
| Prometheus scrape | `GET /metrics` Prometheus text via `ObservingHttpRouter` + `toPrometheusText`; `prom-client` deferred |
| Distributed tracing | `Tracer`/`Span`, `InMemoryTracer`, `OtlpTracesExporter` `/v1/traces`, ObservingHttpRouter HTTP spans + minimal `traceparent`; official SDK / full W3C propagator suite deferred |

## 4. Validation strategy

Correctness is proven by **dependency-free `tsx` validation runners** that
assert invariants and exit non-zero on failure. Concrete adapters used in
default validation are **fake or in-memory only** — no Docker daemon, network,
API keys, or real servers are required for `pnpm validate`. Optional live
runners skip (exit 0) when env is unset and are not part of top-level validate.

## 5. Intentional non-goals / still deferred by design

Nested deferrals that remain **out of Project 2 by design** (not “unimplemented
Partial”):

- Official SDKs: `@opentelemetry/*`, OpenSearch JS (`@opensearch-project/opensearch`), LLM vendor SDKs, official MCP SDK
- Express / Fastify HTTP frameworks
- Full OIDC authorization-code login flows and JWT/OIDC SDKs (`jsonwebtoken`, `jose`, `passport`)
- Full W3C propagator suite / baggage (minimal `traceparent` parent continuation is implemented; official `prom-client` remains deferred)

Charter Platform Baseline capabilities (section 2) remain **Completed**.
Post-baseline items (section 3) stay **Partial**, not Completed.

## 6. Relationship to Project1

| Concern | Project1 (`public-law-ai`) | This project |
|---|---|---|
| Domain | Korean legal statutes / cases | General knowledge documents |
| Architecture | Clean / Hexagonal / DDD | Same philosophy |
| Validation | `tsx` runners, fake adapters | Same approach |
| Goal | Portfolio RAG backend + UI | Broader knowledge + MCP + Agent platform baseline |
