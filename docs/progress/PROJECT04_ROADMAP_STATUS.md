# Project 4 Roadmap Status

> Enterprise LLMOps Platform  
> **Active (Charter Skeleton)** — Sprint 45

## Status

**Active (Charter Skeleton).** Project 4 Enterprise LLMOps Platform charter
docs and static skeleton validation are in progress. No LLMOps product/runtime
modules in this Sprint.

**Project 2 remains CLOSED** (Sprint 37). **Project 3 remains CLOSED
(Partial)** (Sprint 44). Do not reopen Project 2/3 tracks.
**Partial ≠ Completed** for Project 2 infra adapters and Project 3 Multi-Agent
capabilities.

## Reuse from Project 2 / Project 3

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/evaluation` — RAG / run evaluators (gates harness base)
- `app/knowledge/observability` — OTLP / metrics boundaries
- `app/knowledge/jobs` — background / batch job boundaries
- `app/knowledge/ai` — HTTP LLM + Fake LLM paths
- `app/knowledge/composition` — composition root
- `app/knowledge/workflow` — Project 3 Multi-Agent workflow (Partial)
- `app/knowledge/application` — use cases over ports
- Dependency-free `tsx` validation runners and Project 2/3 closeout validators

## Charter capabilities (planned)

| Capability | Status | Notes |
|---|---|---|
| Experiment / Run Tracking | **Not Started** | Documented in PROJECT04_INSTRUCTIONS only |
| Prompt & Model Registry | **Not Started** | Documented in PROJECT04_INSTRUCTIONS only |
| Evaluation Gates / Regression Harness | **Not Started** | Extend existing evaluators; no LLM-as-judge in skeleton |
| Deployment / Serving Configuration | **Not Started** | Documented in PROJECT04_INSTRUCTIONS only |
| LLMOps Observability | **Not Started** | Build on OTLP/metrics; official SDK still deferred |

## Remaining by design (skeleton phase)

- Implementing any LLMOps product/runtime features in Sprint 45
- Reopening Project 2 CLOSED or Project 3 CLOSED (Partial)
- Promoting Partial → Completed
- Express/Fastify, full OIDC login, official vendor LLMOps SaaS SDKs as hard deps

## Task range

| Range | Scope |
|---|---|
| Sprint 45 (Task 186–189) | Establish Project 4 Charter Skeleton |
