# Project 4 Roadmap Status

> Enterprise LLMOps Platform  
> **Active — Run Tracking + Registry + Evaluation Gates Partial** — Sprint 48

## Status

**Active — Run Tracking + Registry + Evaluation Gates Partial.**
Experiment / Run Tracking, Prompt & Model Registry, and Evaluation Gates /
Regression Harness are Fake/InMemory-proven (**Partial**, not Completed).
Deployment / Serving and LLMOps Observability remain **Not Started**.

**Project 2 remains CLOSED** (Sprint 37). **Project 3 remains CLOSED
(Partial)** (Sprint 44). Do not reopen Project 2/3 tracks.
**Partial ≠ Completed** for Project 2 infra adapters, Project 3 Multi-Agent
capabilities, and Project 4 LLMOps Partial capabilities.

## Reuse from Project 2 / Project 3

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/jobs` — JobStore / InMemoryJobStore pattern (not replaced)
- `app/knowledge/mcp` — registry duplicate-reject / list patterns
- `app/knowledge/evaluation` — Default evaluator pattern (gates use generic numeric metrics only; evaluation API unchanged)
- `app/knowledge/observability` — OTLP / metrics boundaries (not extended yet)
- `app/knowledge/ai` — HTTP LLM + Fake LLM paths (not bound to registry)
- `app/knowledge/composition` — composition root
- `app/knowledge/workflow` — Project 3 Multi-Agent workflow (Partial)
- `app/knowledge/application` — use cases over ports
- Dependency-free `tsx` validation runners and Project 2/3 closeout validators

## Charter capabilities

| Capability | Status | Notes |
|---|---|---|
| Experiment / Run Tracking | **Partial** | `llmops` store + `pnpm validate:llmops:contract` / `validate:llmops:run-store` |
| Prompt & Model Registry | **Partial** | `PromptRegistry` / `ModelRegistry` + `pnpm validate:llmops:prompt-registry` / `validate:llmops:model-registry` |
| Evaluation Gates / Regression Harness | **Partial** | `EvaluationGateEvaluator` / `RegressionHarness` + `pnpm validate:llmops:evaluation-gate` / `validate:llmops:regression-harness`; no LLM-as-judge |
| Deployment / Serving Configuration | **Not Started** | Deferred |
| LLMOps Observability | **Not Started** | Build on OTLP/metrics later; official SDK still deferred |

## Remaining by design

- Deployment / Serving / Observability product code
- Promoting Partial → Completed
- Reopening Project 2 CLOSED or Project 3 CLOSED (Partial)
- Express/Fastify, full OIDC login, official vendor LLMOps SaaS SDKs as hard deps
- LLM-as-judge; binding `ai` LanguageModelProvider to registry; SQL adapters; HTTP API

## Task range

| Range | Scope |
|---|---|
| Sprint 45 (Task 186–189) | Establish Project 4 Charter Skeleton |
| Sprint 46 (Task 190–193) | Establish Experiment / Run Tracking (Partial) |
| Sprint 47 (Task 194–197) | Establish Prompt & Model Registry (Partial) |
| Sprint 48 (Task 198–201) | Establish Evaluation Gates / Regression Harness (Partial) |

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
Completed). Project 2 remains **CLOSED**. Project 3 remains **CLOSED (Partial)**.

## Sprint 47 close note

**Sprint 47 — Establish Prompt & Model Registry: Partial.** Tasks 194–197 added
Prompt/Model registry contracts, InMemory adapters, and validators. Prompt &
Model Registry is **Partial** (not Completed). Gates / Serving / Observability
remain **Not Started**. Project 2 remains **CLOSED**. Project 3 remains
**CLOSED (Partial)**.

## Sprint 48 close note

**Sprint 48 — Establish Evaluation Gates / Regression Harness: Partial.** Tasks
198–201 added gate/regression contracts, Default adapters, and validators.
Evaluation Gates / Regression Harness is **Partial** (not Completed). Serving /
Observability remain **Not Started**. No LLM-as-judge. Project 2 remains
**CLOSED**. Project 3 remains **CLOSED (Partial)**.
