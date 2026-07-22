# Project 4 Roadmap Status

> Enterprise LLMOps Platform  
> **Active — Experiment / Run Tracking Partial** — Sprint 46

## Status

**Active — Experiment / Run Tracking Partial.** `app/knowledge/llmops`
Experiment / Run Tracking is Fake/InMemory-proven (**Partial**, not Completed).
Prompt & Model Registry, Evaluation Gates, Deployment / Serving, and LLMOps
Observability remain **Not Started**.

**Project 2 remains CLOSED** (Sprint 37). **Project 3 remains CLOSED
(Partial)** (Sprint 44). Do not reopen Project 2/3 tracks.
**Partial ≠ Completed** for Project 2 infra adapters, Project 3 Multi-Agent
capabilities, and Project 4 Experiment / Run Tracking.

## Reuse from Project 2 / Project 3

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/jobs` — JobStore / InMemoryJobStore pattern (not replaced)
- `app/knowledge/evaluation` — RAG / run evaluators (gates harness base; not extended yet)
- `app/knowledge/observability` — OTLP / metrics boundaries (not extended yet)
- `app/knowledge/ai` — HTTP LLM + Fake LLM paths
- `app/knowledge/composition` — composition root
- `app/knowledge/workflow` — Project 3 Multi-Agent workflow (Partial)
- `app/knowledge/application` — use cases over ports
- Dependency-free `tsx` validation runners and Project 2/3 closeout validators

## Charter capabilities

| Capability | Status | Notes |
|---|---|---|
| Experiment / Run Tracking | **Partial** | `llmops` store + `pnpm validate:llmops:contract` / `validate:llmops:run-store` |
| Prompt & Model Registry | **Not Started** | Deferred |
| Evaluation Gates / Regression Harness | **Not Started** | Extend existing evaluators later; no LLM-as-judge required yet |
| Deployment / Serving Configuration | **Not Started** | Deferred |
| LLMOps Observability | **Not Started** | Build on OTLP/metrics later; official SDK still deferred |

## Remaining by design

- Prompt & Model Registry / Gates / Serving / Observability product code
- Promoting Experiment / Run Tracking Partial → Completed
- Reopening Project 2 CLOSED or Project 3 CLOSED (Partial)
- Express/Fastify, full OIDC login, official vendor LLMOps SaaS SDKs as hard deps
- SQL/Postgres ExperimentRunStore / HTTP composition API for runs

## Task range

| Range | Scope |
|---|---|
| Sprint 45 (Task 186–189) | Establish Project 4 Charter Skeleton |
| Sprint 46 (Task 190–193) | Establish Experiment / Run Tracking (Partial) |

## Sprint 45 close note

**Sprint 45 — Establish Project 4 Charter Skeleton: complete.** Tasks 186–189
added PROJECT04 Active charter, Progress/Roadmap stubs, agent-ops pointers, and
`pnpm validate:project04:charter-skeleton`. Five LLMOps capabilities started as
**Not Started**. Project 2 remains **CLOSED**. Project 3 remains **CLOSED
(Partial)**.

## Sprint 46 close note

**Sprint 46 — Establish Experiment / Run Tracking: Partial.** Tasks 190–193
added `llmops` Experiment/Run contract, `InMemoryExperimentRunStore`, and
dependency-free validators. Experiment / Run Tracking is **Partial** (not
Completed). Other four capabilities remain **Not Started**. Project 2 remains
**CLOSED**. Project 3 remains **CLOSED (Partial)**.
