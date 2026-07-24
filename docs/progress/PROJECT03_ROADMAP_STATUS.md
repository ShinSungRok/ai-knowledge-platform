# Project 3 Roadmap Status

> Enterprise AI Workflow — Multi-Agent  
> **Project 3: CLOSED (Partial)** — Sprint 44

## Status

**Project 3: CLOSED (Partial).** All five charter capabilities remain
**Partial** (none Completed). Charter Skeleton (Sprint 38) through Evaluation
(Sprint 43) plus closeout (Sprint 44) are complete. LLM-as-judge and HTTP
multi-agent API remain deferred. Project 2 session `MemoryStore` / RAG
evaluation remain unchanged.

**Project 2 remains CLOSED** (Sprint 37). Partial infrastructure adapters from
Project 2 stay Partial — not Completed. Do not reopen Project 2 tracks.
**Partial ≠ Completed** for Project 3 Multi-Agent capabilities.

**Charter next (historical):** Project 4 — Enterprise LLMOps Platform
(CLOSED Partial). Project 4 docs: `PROJECT04_*`.

## P3 Portfolio Reinforcement Track (human-authorized)

**Status: Phase B Complete; await Later charter** — Sprint 64

Additional portfolio track **after** Project 3: CLOSED (Partial). Does **not**
reopen Multi-Agent capabilities to Completed. Does **not** invent Project 5.

| Phase | Goal | Status |
|---|---|---|
| P3-0 | Console engine demo + `docs/P3_WORKFLOW_ENGINE.md` | **Complete** (Task 186) |
| Phase A | Researcher step reuses P2 cited-answer (InMemory/Fake) | **Complete** (Tasks 187–189) |
| Phase B | Evaluation demo (run → score metrics, no LLM-as-judge) | **Complete** (Tasks 190–192) |
| Later | Optional thin HTTP / optional real invoker | Deferred |

**Frozen in this track:** Express/Fastify; Partial→Completed; LLM-as-judge;
SQL workflow memory; full multi-agent HTTP product API (unless later Phase).

## Reuse from Project 2

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/agent` — single-agent planner / executor / reviewer / orchestrator
- `app/knowledge/mcp` / `tools` — tool registry and tool calling
- `app/knowledge/memory` — session memory (not Knowledge search; not replaced by workflow memory)
- `app/knowledge/evaluation` — RAG evaluators (not replaced by workflow evaluation)
- `app/knowledge/application` / `composition` — use cases and composition root
- Dependency-free `tsx` validation runners and static closeout validators
- Optional Partial infra (Postgres, OpenSearch, HTTP LLM, OTLP, JWT, Prometheus,
  MCP HTTP + stdio) as Fake-validated paths

## Charter capabilities (closed Partial)

| Capability | Status | Notes |
|---|---|---|
| Multi-Agent Role Contract | **Partial** | `workflow` module: roles/descriptors + InMemory registry; `pnpm validate:workflow:contract` / `validate:workflow:registry` |
| Workflow Orchestrator | **Partial** | `DeterministicWorkflowPlanner` + `DefaultWorkflowOrchestrator` + `FakeWorkflowAgentInvoker`; `pnpm validate:workflow:orchestrator` |
| Agent Handoff / Delegation | **Partial** | `WorkflowHandoff` / `DefaultWorkflowHandoffBuilder`; runtime handoff overrides step input after step 0; `pnpm validate:workflow:handoff` |
| Shared Workflow Memory | **Partial** | `WorkflowMemoryStore` / `InMemoryWorkflowMemoryStore`; orchestrator appends objective/handoff/step_output; `pnpm validate:workflow:memory` |
| Multi-Agent Evaluation | **Partial** | `WorkflowRunEvaluator` / `DefaultWorkflowRunEvaluator` + `RunWorkflowEvaluationUseCase`; `pnpm validate:workflow:evaluation` / `validate:application:eval-workflow`; no LLM-as-judge |

## Remaining by design

- LLM-as-judge / reading memory into invoker prompts for scoring
- Official SDKs, Express/Fastify, full OIDC login, full W3C propagator
- Reopening Project 2 CLOSED tracks or promoting Partial → Completed
- Conflating Project 2 `AgentRole` / session `MemoryStore` / RAG evaluation with workflow caps
- Application/HTTP multi-agent API wiring / SQL workflow memory
- Full PROJECT04 charter implementation (handoff text only in Project 3 closeout)

## Task range

| Range | Scope |
|---|---|
| Sprint 38 (Task 158–161) | Establish Project 3 Charter Skeleton |
| Sprint 39 (Task 162–165) | Establish Multi-Agent Role Contract (Partial) |
| Sprint 40 (Task 166–169) | Establish Workflow Orchestrator (Partial) |
| Sprint 41 (Task 170–173) | Establish Agent Handoff / Delegation (Partial) |
| Sprint 42 (Task 174–177) | Establish Shared Workflow Memory (Partial) |
| Sprint 43 (Task 178–181) | Establish Multi-Agent Evaluation (Partial) |
| Sprint 44 (Task 182–185) | Close Out Project 3 / Project 4 Handoff (CLOSED Partial) |

## Sprint 38–43 summary

Sprints 38–43 delivered Charter Skeleton through Multi-Agent Evaluation as
**Partial** Fake/InMemory-proven boundaries. See prior close notes in Progress
Log (`PROJECT03_PROGRESS.md`). Project 2 remained **CLOSED** throughout.

## Sprint 44 close note

**Sprint 44 — Close Out Project 3 / Project 4 Handoff: CLOSED.** Tasks 182–185
recorded portfolio **Project 3: CLOSED (Partial)**, aligned README/development,
added `pnpm validate:project03:closeout`, and finalized this roadmap header.
Five capabilities stay **Partial** (none Completed). **Next:** Project 4 —
Enterprise LLMOps Platform. Project 2 remains **CLOSED**.
