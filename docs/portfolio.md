# Portfolio / Project Intent

Interview / resume narrative (Why → What → How, Backend framing):
[`docs/PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

## 1. What this is

**AI Knowledge Platform** is a production-shaped TypeScript backend for
knowledge retrieval and grounded question answering. It inherits the Clean /
Hexagonal / DDD architecture philosophy proven in Project1 (`public-law-ai`),
generalized beyond a single legal domain.

**Portfolio framing (adopted):** P2 = Knowledge Retrieval & Serving Platform;
P3 = Multi-Agent Workflow Engine; P4 = LLMOps / Control Plane — Knowledge →
Execution → Operations over Public Law AI (P1).

P3 demo/runbook: [`P3_WORKFLOW_ENGINE.md`](P3_WORKFLOW_ENGINE.md)
(`pnpm demo:workflow:engine`).

## 1b. Project 2: CLOSED

**Project 2: CLOSED.** The charter for this repository’s active Project 2 work
is complete:

| Track | Status | Sprint |
|---|---|---|
| Charter Platform Baseline | **CLOSED** (capabilities Completed) | Sprint 20 |
| Post-baseline Infrastructure | **CLOSED (Partial)** | Sprint 31 |
| Nested Deferral Expansion | **CLOSED (Partial)** | Sprint 36 |
| Project 2 overall / handoff | **CLOSED** | Sprint 37 |

Partial infrastructure adapters (sections 3 / 3b) stay **Partial** — they are
**not** promoted to Completed. Remaining by-design non-goals (official SDKs,
Express/Fastify, full OIDC login/SDK, full W3C propagator suite / `prom-client`)
remain out of Project 2.

Default `pnpm validate` stays **dependency-free** (Fake / in-memory adapters).

**P2 Service Completion (human-authorized):** Phase A **Complete**; Phase B
**Complete**; track **Complete** (Sprint 61 — `pnpm start`, optional LLM /
Postgres / OpenSearch, compose `app`). Does **not** reopen charter baseline
CLOSED or promote Partial infra to Completed. P3/P4 product work remains
frozen. No Project 5.

## 1c. Project 3: CLOSED (Partial) — Enterprise AI Workflow (Multi-Agent)

**Project 3: CLOSED (Partial).** The active Project 3 Multi-Agent charter is
complete as a **Partial** closeout — five charter capabilities are each
**Partial** (none Completed):

| Capability | Status | Representative validators |
|---|---|---|
| Multi-Agent Role Contract | **Partial** | `pnpm validate:workflow:contract`, `validate:workflow:registry` |
| Workflow Orchestrator | **Partial** | `pnpm validate:workflow:orchestrator` |
| Agent Handoff / Delegation | **Partial** | `pnpm validate:workflow:handoff` |
| Shared Workflow Memory | **Partial** | `pnpm validate:workflow:memory` |
| Multi-Agent Evaluation | **Partial** | `pnpm validate:workflow:evaluation`, `validate:application:eval-workflow` |

Partial means Fake/InMemory-proven boundaries exist; they are **not** promoted
to Completed. Charter Skeleton (Sprint 38) through Evaluation (Sprint 43)
remain the evidence base; Sprint 44 records overall closeout.

**Reuse from Project 2:**

- Clean / Hexagonal / DDD module boundaries and a single composition root
- MCP tool registry, tool calling, agent planner→execute→review, session memory
- Dependency-free `tsx` validation runners and static closeout validators
- Partial infra adapters (Postgres, OpenSearch, HTTP LLM, OTLP, JWT OIDC-lite,
  Prometheus scrape, MCP HTTP + stdio) as optional Fake-validated paths

**Remaining by design (out of Project 3 closeout):**
LLM-as-judge, HTTP multi-agent API, promoting Partial → Completed, and
inherited Project 2 non-goals where still applicable (official SDKs,
Express/Fastify, full OIDC authorization-code login, full W3C propagator suite
/ `prom-client`).

**Project 4 handoff — Enterprise LLMOps Platform:** See §1d. Project 4 is
**CLOSED (Partial)** and reuses Project 2/3 platforms. Closing Project 4 does
**not** reopen Project 2 or Project 3.

Charter (historical after Sprint 44): [`docs/agent/PROJECT03_INSTRUCTIONS.md`](agent/PROJECT03_INSTRUCTIONS.md).
Progress / roadmap: [`docs/progress/PROJECT03_PROGRESS.md`](progress/PROJECT03_PROGRESS.md),
[`docs/progress/PROJECT03_ROADMAP_STATUS.md`](progress/PROJECT03_ROADMAP_STATUS.md).

## 1d. Project 4: CLOSED (Partial) — Enterprise LLMOps Platform

**Project 4: CLOSED (Partial).** The active Project 4 Enterprise LLMOps charter
is complete as a **Partial** closeout — five charter capabilities are each
**Partial** (none Completed): Experiment / Run Tracking (Sprint 46), Prompt &
Model Registry (Sprint 47), Evaluation Gates / Regression Harness (Sprint 48),
Deployment / Serving Configuration (Sprint 49), LLMOps Observability
(Sprint 50). Reuses Project 2/3 platforms. Soft link only: run `params` /
`metrics` and serving config ids may reference registry or gates. Observation
records soft-link run/serving ids and soft-map Metrics/OTLP names
(`llmops.quality.<key>`, `llmops.cost.units`, `llmops.latency.ms`) without
importing `observability`. Sprint 51 records overall closeout.

| Capability | Status | Evidence |
|---|---|---|
| Experiment / Run Tracking | **Partial** | `app/knowledge/llmops`, `pnpm validate:llmops:contract`, `validate:llmops:run-store` |
| Prompt & Model Registry | **Partial** | `PromptRegistry` / `ModelRegistry`, `pnpm validate:llmops:prompt-registry`, `validate:llmops:model-registry` |
| Evaluation Gates / Regression Harness | **Partial** | `EvaluationGateEvaluator` / `RegressionHarness`, `pnpm validate:llmops:evaluation-gate`, `validate:llmops:regression-harness` |
| Deployment / Serving Configuration | **Partial** | `ServingConfigStore` / `InMemoryServingConfigStore`, `pnpm validate:llmops:serving-config` |
| LLMOps Observability | **Partial** | `LlmopsObservationStore` / `InMemoryLlmopsObservationStore`, `pnpm validate:llmops:observation-store` |

Project 2 remains **CLOSED**. Project 3 remains **CLOSED (Partial)**.
**Partial ≠ Completed**. Closing Project 4 does **not** reopen Project 2 or
Project 3. This closeout does **not** invent a Project 5 / PROJECT05 charter.

Charter: [`docs/agent/PROJECT04_INSTRUCTIONS.md`](agent/PROJECT04_INSTRUCTIONS.md)
(Closed historical).
Progress / roadmap: [`docs/progress/PROJECT04_PROGRESS.md`](progress/PROJECT04_PROGRESS.md),
[`docs/progress/PROJECT04_ROADMAP_STATUS.md`](progress/PROJECT04_ROADMAP_STATUS.md).
Static checks: `pnpm validate:project04:charter-skeleton`,
`pnpm validate:project04:closeout`.

## 1e. Project sequence

| Project | Portfolio name | Why (one line) | Status |
|---|---|---|---|
| Project 1 | Public Law AI | 공공 법률을 신뢰 가능한 AI 검색·답변으로 | Complete (separate repo) |
| Project 2 | Knowledge Retrieval & Serving Platform | 기업 지식을 AI가 검색·serving할 기반 | **CLOSED** + Service Completion **Complete** |
| Project 3 | Multi-Agent Workflow Engine | 복잡한 업무를 역할 워크플로로 실행 | **CLOSED (Partial)** |
| Project 4 | LLMOps / Control Plane | 버전·평가·배포설정·관측으로 운영 | **CLOSED (Partial)** |

Project 2 delivers a **completed platform baseline**: workspace-scoped
knowledge pipelines through cited RAG answers, MCP/tool/agent/memory/jobs,
evaluation, in-process runtime, and operations foundations — all proven by
dependency-free validation runners against fake/in-memory adapters.

Post-baseline Sprints 21–30 add **Partial** infrastructure adapters (Fake-
validated; live optional via env). Nested deferral expansion Sprints 32–35
add further **Partial** evidence (JWT/OIDC-lite, Prometheus scrape, OTLP
tracing, MCP stdio) without reopening Charter Platform Baseline closeout
(Sprint 20) or Post-baseline Infrastructure Track CLOSED (Partial)
(Sprint 31). Nested Deferral Expansion Track is **CLOSED (Partial)**
(Sprint 36).

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
| MCP network | JSON-RPC HTTP `POST /mcp` (`tools/list`·`tools/call`); default network path; official MCP SDK deferred |
| TCP listen | `NodeHttpListener` + listening operations (`createListeningOperationsServer`); Express unused |
| AuthN (API Key) | API Key / Bearer for operations/listening cited-answer and `/mcp` |
| OTLP export (logs/metrics) | OTLP/HTTP log+metrics via Fake transport; optional `OTEL_EXPORTER_OTLP_ENDPOINT`; official OTel SDK deferred |

## 3b. Nested deferral expansion (Partial) — Sprints 32–35

Sprints 32–35 closed selected nested deferrals as **Partial** Fake-/in-memory-
validated paths. They do **not** mark these adapters Completed.

| Area | Partial evidence |
|---|---|
| AuthN (JWT / OIDC-lite) | Optional JWT HS256 + JWKS RS256 (`Hs256JwtAuthenticator`, `Rs256JwtAuthenticator`); default operations AuthN remains ApiKey; full OIDC login/SDK deferred |
| Prometheus scrape | `GET /metrics` Prometheus text via `ObservingHttpRouter` + `toPrometheusText`; `prom-client` deferred |
| Distributed tracing | `Tracer`/`Span`, `InMemoryTracer`, `OtlpTracesExporter` `/v1/traces`, `ExportingTracer`, ObservingHttpRouter HTTP spans + minimal `traceparent`; official SDK / full W3C propagator suite deferred |
| MCP stdio | Newline-delimited JSON-RPC via `StdioMcpJsonRpcSession` + Fake streams; `createInMemoryStdioMcpSession`; HTTP `/mcp` remains the default network path; official MCP SDK deferred |

## 4. Validation strategy

Correctness is proven by **dependency-free `tsx` validation runners** that
assert invariants and exit non-zero on failure. Concrete adapters used in
default validation are **fake or in-memory only** — no Docker daemon, network,
API keys, or real servers are required for `pnpm validate`. Optional live
runners skip (exit 0) when env is unset and are not part of top-level validate.

## 5. Intentional non-goals / still deferred by design

Nested deferrals that remain **out of Project 2 by design** (not “unimplemented
Partial” — MCP stdio, JWT OIDC-lite, Prometheus scrape, and OTLP tracing
above are implemented as Partial):

- Official SDKs: `@opentelemetry/*`, OpenSearch JS (`@opensearch-project/opensearch`), LLM vendor SDKs, official MCP SDK
- Express / Fastify HTTP frameworks
- Full OIDC authorization-code login flows and JWT/OIDC SDKs (`jsonwebtoken`, `jose`, `passport`)
- Full W3C propagator suite / baggage and official `prom-client` (minimal `traceparent` and dependency-free Prometheus text scrape are implemented)

Charter Platform Baseline capabilities (section 2) remain **Completed**.
Post-baseline and nested-expansion items (sections 3 / 3b) stay **Partial**,
not Completed.

## 6. Relationship to Project1

| Concern | Project1 (`public-law-ai`) | This project (Project 2) |
|---|---|---|
| Domain | Korean legal statutes / cases | General knowledge documents |
| Architecture | Clean / Hexagonal / DDD | Same philosophy |
| Validation | `tsx` runners, fake adapters | Same approach |
| Goal | Portfolio RAG backend + UI | Knowledge + MCP + Agent platform (**CLOSED**; handoff to Project 3 Multi-Agent) |
