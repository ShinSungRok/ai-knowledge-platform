# Project 4 Roadmap Status

> Enterprise LLMOps Platform  
> **Project 4: CLOSED (Partial)** — Sprint 51

## Status

**Project 4: CLOSED (Partial).** All five charter capabilities remain
**Partial** (none Completed). Charter Skeleton (Sprint 45) through Observability
(Sprint 50) plus closeout (Sprint 51) are complete. Express/HTTP serving,
official vendor LLMOps SaaS SDKs, live OTLP wiring, and Partial→Completed are
out of this closeout. This closeout does **not** invent a Project 5 /
PROJECT05 charter.

**Project 2 remains CLOSED** (Sprint 37). **Project 3 remains CLOSED
(Partial)** (Sprint 44). Do not reopen Project 2/3/4 **charter** tracks.
**Partial ≠ Completed** for Project 2 infra adapters, Project 3 Multi-Agent
capabilities, and Project 4 LLMOps Partial capabilities.

## P4 Portfolio Reinforcement Track (human-authorized)

**Status: Later Active — Thin Control Plane HTTP** — Sprint 71

Additional portfolio track **after** Project 4: CLOSED (Partial). Does **not**
promote Partial → Completed. Does **not** invent Project 5. Does **not** add
Express/Fastify or full CRUD LLMOps API.

| Phase | Goal | Status |
|---|---|---|
| Phase 0 | Console control-plane demo + `docs/P4_LLMOPS.md` | **Complete** (Tasks 214–216) |
| Later | Thin Control Plane HTTP on `pnpm start` (Bearer; InMemory) | **Active** (Sprint 71, Tasks 217+) |

P3 Portfolio Reinforcement Phase A+B and Later Thin Workflow HTTP remain
Complete. Charter LLMOps capabilities stay **Partial**.

## Reuse from Project 2 / Project 3

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/jobs` — JobStore / InMemoryJobStore pattern (not replaced)
- `app/knowledge/mcp` — registry duplicate-reject / list patterns
- `app/knowledge/evaluation` — Default evaluator pattern (gates use generic numeric metrics only; evaluation API unchanged)
- `app/knowledge/observability` — OTLP / metrics boundaries (soft-map naming only from `llmops`; not imported by `llmops`)
- `app/knowledge/ai` — HTTP LLM + Fake LLM paths (not bound to registry or serving)
- `app/knowledge/composition` — composition root
- `app/knowledge/workflow` — Project 3 Multi-Agent workflow (Partial)
- `app/knowledge/application` — use cases over ports
- Dependency-free `tsx` validation runners and Project 2/3/4 closeout validators

## Charter capabilities

| Capability | Status | Notes |
|---|---|---|
| Experiment / Run Tracking | **Partial** | `llmops` store + `pnpm validate:llmops:contract` / `validate:llmops:run-store` |
| Prompt & Model Registry | **Partial** | `PromptRegistry` / `ModelRegistry` + `pnpm validate:llmops:prompt-registry` / `validate:llmops:model-registry` |
| Evaluation Gates / Regression Harness | **Partial** | `EvaluationGateEvaluator` / `RegressionHarness` + `pnpm validate:llmops:evaluation-gate` / `validate:llmops:regression-harness`; no LLM-as-judge |
| Deployment / Serving Configuration | **Partial** | `ServingConfigStore` + `pnpm validate:llmops:serving-config`; soft-link ids only; no HTTP/Express |
| LLMOps Observability | **Partial** | `LlmopsObservationStore` + `pnpm validate:llmops:observation-store`; soft-map to Metrics/OTLP names; no `@opentelemetry/*` / live OTLP |

## Remaining by design

- Promoting Partial → Completed
- Reopening Project 2 CLOSED, Project 3 CLOSED (Partial), or Project 4 CLOSED (Partial)
- Express/Fastify HTTP serving, full OIDC login, official vendor LLMOps SaaS SDKs as hard deps
- LLM-as-judge; binding `ai` LanguageModelProvider to registry/serving; SQL adapters
- Live OTLP export / wiring ExportingMetrics from `llmops` observations
- Inventing Project 5 / PROJECT05 in this closeout

## Task range

| Range | Scope |
|---|---|
| Sprint 45 (Task 186–189) | Establish Project 4 Charter Skeleton |
| Sprint 46 (Task 190–193) | Establish Experiment / Run Tracking (Partial) |
| Sprint 47 (Task 194–197) | Establish Prompt & Model Registry (Partial) |
| Sprint 48 (Task 198–201) | Establish Evaluation Gates / Regression Harness (Partial) |
| Sprint 49 (Task 202–205) | Establish Deployment / Serving Configuration (Partial) |
| Sprint 50 (Task 206–209) | Establish LLMOps Observability (Partial) |
| Sprint 51 (Task 210–213) | Close Out Project 4 (CLOSED Partial) |
| Sprint 71 (Task 217–220) | P4 Later Thin Control Plane HTTP (Bearer llmops/control-plane on pnpm start; Partial caps unchanged) |

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

## Sprint 49 close note

**Sprint 49 — Establish Deployment / Serving Configuration: Partial.** Tasks
202–205 added ServingConfigStore contract, InMemoryServingConfigStore, and
validators. Deployment / Serving Configuration is **Partial** (not Completed).
LLMOps Observability remains **Not Started**. No HTTP/Express serving. Project 2
remains **CLOSED**. Project 3 remains **CLOSED (Partial)**.

## Sprint 50 close note

**Sprint 50 — Establish LLMOps Observability: Partial.** Tasks 206–209 added
LlmopsObservationStore contract, InMemoryLlmopsObservationStore, and
`pnpm validate:llmops:observation-store`. LLMOps Observability is **Partial**
(not Completed). All five charter capabilities are **Partial**. Soft-map only to
observability Metrics/OTLP names (`llmops.quality.<key>`, `llmops.cost.units`,
`llmops.latency.ms`); `llmops` does not import `observability`. No live OTLP /
`@opentelemetry/*` / HTTP serving. Project 2 remains **CLOSED**. Project 3
remains **CLOSED (Partial)**. Project 4 is **not** CLOSED.

## Sprint 51 close note

**Sprint 51 — Close Out Project 4: CLOSED (Partial).** Tasks 210–213 recorded
portfolio **Project 4: CLOSED (Partial)**, aligned README/development/agent-ops,
added `pnpm validate:project04:closeout`, and finalized roadmap/charter as
Closed (historical). All five LLMOps capabilities remain **Partial** (not
Completed). Project 2 remains **CLOSED**. Project 3 remains **CLOSED
(Partial)**. No Project 5 / PROJECT05 charter.
