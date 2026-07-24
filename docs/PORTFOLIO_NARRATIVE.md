# Portfolio Narrative — AI Backend Platform Series

Target role: **AI Backend Engineer**  
Emphasis: **Backend** (pipelines, engines, control plane) over AI buzzwords.

Interview structure for every project: **Why → What → How**.

---

## Platform evolution story

```text
P1 Public Law AI          Search / Grounded RAG (domain product)
        ↓
P2 Knowledge Retrieval    Knowledge foundation (ingest → serve)
   & Serving Platform
        ↓
P3 Multi-Agent            Workflow execution engine
   Workflow Engine
        ↓
P4 LLMOps                 Operations / control plane
   Control Plane
```

```text
                    +----------------------+
                    | LLMOps Control Plane |
                    | Version · Evaluation |
                    | Deployment · Monitor |
                    +----------▲-----------+
                               │
             +-----------------┴------------------+
             │                                    │
             ▼                                    ▼
 +----------------------+           +----------------------+
 | Knowledge Retrieval  |  uses     | Multi-Agent Workflow |
 | & Serving Platform   |◄──────────| Engine               |
 | Ingest→Chunk→Embed   |           | Planner · Orchestr.  |
 | Index→Retrieve→Serve |           | Handoff · Memory     |
 +----------▲-----------+           +-----------▲----------+
            │                                   │
            +-------------------┬---------------+
                                │
                                ▼
                         Client / API
```

**Responsibilities**

| Layer | Name | Responsibility |
|---|---|---|
| Knowledge | P2 | Make enterprise knowledge searchable and servable |
| Execution | P3 | Run complex work as role-based workflows |
| Operations | P4 | Version, evaluate, deploy-config, and observe AI systems |

---

## Why (one line each)

| Project | Why |
|---|---|
| **P1** Public Law AI | 공공 법률 데이터를 신뢰 가능한 AI 검색·답변으로 제공하기 위해 |
| **P2** Knowledge Retrieval & Serving | 다양한 기업 지식을 AI가 검색·활용할 수 있는 **기반 플랫폼**을 만들기 위해 |
| **P3** Multi-Agent Workflow Engine | 단일 호출로 어려운 업무를 **역할 기반 협업 워크플로**로 자동화하기 위해 |
| **P4** LLMOps / Control Plane | AI 서비스를 **평가·버전·배포설정·관측**으로 지속 운영하기 위해 |

---

## P2 — Knowledge Retrieval & Serving Platform

### Why
기업 지식을 AI가 이해하고 쓸 수 있는 **ingestion → retrieval → serving** 기반이 필요해서.

### What
TypeScript **Knowledge Platform**: workspace-scoped knowledge pipeline + grounded serving API (citation). MCP/agent/jobs/evaluation foundations included.

### How (backend pipeline)

```text
Ingestion → Chunk → Embedding → Index
    → Retrieval (keyword / vector / hybrid / rerank)
    → Prompt → Answer (+ citation)
    → HTTP serve (`pnpm start`)
```

| Item | Detail |
|---|---|
| Entry | `pnpm start` · compose `app` |
| API | `GET /health`, `GET /metrics`, `POST .../cited-answers`, `POST /mcp` |
| Architecture | Clean / Hexagonal / DDD · composition root |
| Proof | Fake/InMemory validators + live host smoke |
| Manual | [`docs/P2_SERVICE_MANUAL.md`](P2_SERVICE_MANUAL.md) |

**Interview one-liner:**  
“I built a knowledge retrieval and serving platform: pipeline from ingest to cited answers, with dependency-free validation and a runnable HTTP host.”

---

## P3 — Multi-Agent Workflow Engine

### Why
복잡한 업무는 한 번의 LLM 호출로 끝나지 않아서, **역할을 나눠 실행하는 워크플로 엔진**이 필요해서.

### What
**Workflow Engine** over multi-agent roles: plan, orchestrate, handoff, shared memory, workflow evaluation. Uses P2 capabilities as tools/knowledge—not a vendor picker (Gemini vs Claude).

### How (backend engine)

```text
Goal → Planner → Orchestrator
    → Handoff (sequential / delegation)
    → Role executors (invoker)
    → Shared workflow memory
    → Aggregation / run result
    → Workflow evaluation
```

Roles (examples): coordinator · researcher · synthesizer · critic · executor.

| Item | Detail |
|---|---|
| Module | `app/knowledge/workflow` |
| Demo | `pnpm demo:workflow:engine` · [`P3_WORKFLOW_ENGINE.md`](P3_WORKFLOW_ENGINE.md) |
| Proof | `pnpm validate:workflow:*` |
| Relation to P2 | Workflow execution layer that **reuses** P2 knowledge/tools |

**Interview one-liner:**  
“I extended the platform with a multi-agent workflow engine: planner, orchestration, handoff, and shared memory—so complex work is executed as backend workflows, not a single prompt.”

---

## P4 — LLMOps / Control Plane

### Why
AI를 제품으로 운영하려면 실행만으로는 부족하고, **버전·평가·배포설정·관측** 체계가 필요해서.

### What
**Control plane** over P2/P3-style execution: registry, run tracking, gates/regression, serving configuration, quality/cost/latency observation.

### How (ops plane)

```text
Registry (prompt / model versions)
    → Evaluation (gates / regression)
    → Deployment / serving configuration
    → Monitoring (quality / cost / latency)
    → Feedback into next versions  (design target)
```

| Item | Detail |
|---|---|
| Module | `app/knowledge/llmops` |
| Proof | `pnpm validate:llmops:*` |
| Relation | Operates **above** knowledge + workflow execution |

**Interview one-liner:**  
“I added an LLMOps control plane: version registries, evaluation gates, serving configuration, and operational signals—so the platform can be run as a managed system, not only a demo call.”

---

## Portfolio emphasis (AI Backend Engineer)

| Do | Don't |
|---|---|
| Lead with **pipelines, engines, control plane** | Lead with model brand names |
| Show **P2 runnable demo** first | Claim full production SaaS UI |
| Say P3/P4 are **layers** with validators | Imply P3/P4 are separate customer HTTP products unless you add that |
| Use Why → What → How | Dump feature lists |

### 30-second pitch

> I built an enterprise AI **backend** platform in layers: a **knowledge retrieval and serving** stack (P2) with a real HTTP host; a **multi-agent workflow engine** (P3) for complex work; and an **LLMOps control plane** (P4) for versions, evaluation, serving config, and monitoring. The arc is Search/RAG product → Knowledge foundation → Workflow execution → Operations.

---

## Evidence cheatsheet

| Layer | Command / artifact |
|---|---|
| P2 serve | `pnpm start` · [`P2_SERVICE_MANUAL.md`](P2_SERVICE_MANUAL.md) |
| P2 smoke | `pnpm validate:server:start-smoke` |
| P3 demo | `pnpm demo:workflow:engine` · [`P3_WORKFLOW_ENGINE.md`](P3_WORKFLOW_ENGINE.md) |
| P3 | `pnpm validate:workflow:orchestrator` (and related `workflow:*`) |
| P4 | `pnpm validate:llmops:run-store` (and related `llmops:*`) |
| Full | `pnpm validate` |
