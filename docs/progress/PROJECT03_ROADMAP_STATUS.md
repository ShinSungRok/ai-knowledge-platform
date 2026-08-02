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

**Status: Later Complete — Thin Workflow HTTP** — Sprint 69

Additional portfolio track **after** Project 3: CLOSED (Partial). Does **not**
reopen Multi-Agent capabilities to Completed. Does **not** invent Project 5.

| Phase | Goal | Status |
|---|---|---|
| P3-0 | Console engine demo + `docs/P3_WORKFLOW_ENGINE.md` | **Complete** (Task 186) |
| Phase A | Researcher step reuses P2 cited-answer (InMemory/Fake) | **Complete** (Tasks 187–189) |
| Phase B | Evaluation demo (run → score metrics, no LLM-as-judge) | **Complete** (Tasks 190–192) |
| Later | Thin Workflow HTTP on `pnpm start` (Bearer; Fake + optional P2 bridge) | **Complete** (Sprint 69, Tasks 193–196) |

**Evidence:** `POST /workspaces/:workspaceId/workflow-runs` on listening host;
`pnpm validate:api:workflow-run`; `pnpm validate:server:start-smoke` (401/200);
curl in `docs/P3_WORKFLOW_ENGINE.md`. Charter Multi-Agent capabilities stay
**Partial**.

**Frozen in this track:** Express/Fastify; Partial→Completed; LLM-as-judge;
SQL workflow memory; full multi-agent HTTP product API beyond thin workflow-runs;
P4 HTTP; Project 5.

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
- Application/HTTP multi-agent API beyond thin `workflow-runs` / SQL workflow memory
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
| Sprint 69 (Task 193–196) | P3 Later Thin Workflow HTTP (Bearer workflow-runs on pnpm start; Partial caps unchanged) |

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

## 업데이트 (2026-07-30)

This roadmap page is left as the Sprint-44-era historical closeout record
above and is **not** rewritten in place. As of 2026-07-30, per
`docs/portfolio.md` §1c, two of the five charter capabilities have been
promoted from Partial to **Completed** as substantive functional work (not a
relabel):

- **Multi-Agent Evaluation** — `LlmWorkflowRunContentEvaluator` /
  `WorkflowRunContentEvaluator` (`app/knowledge/workflow/`) adds LLM-as-judge
  content scoring alongside the existing deterministic
  `DefaultWorkflowRunEvaluator`; `pnpm validate:workflow:content-evaluation`,
  `validate:application:eval-workflow-content`.
- **Shared Workflow Memory** — `WorkflowRunStore` /
  `InMemoryWorkflowRunStore` persist run results, and
  `GET /workspaces/:id/workflow-runs/:runId` /
  `GET /workspaces/:id/workflow-runs/:runId/memory` expose both the run and
  its Shared Workflow Memory over HTTP; `pnpm validate:workflow:run-store`,
  `validate:api:workflow-run`, `validate:composition:listening-operations`.

The Sprint-44-era "Frozen in this track: ... LLM-as-judge; Partial→Completed"
line above reflects that point in time and is intentionally left unchanged
as the historical record; `docs/portfolio.md` is the current source of truth
for P3 capability status.

## 업데이트 (2026-07-31)

The remaining three of five charter capabilities have now also been
promoted from Partial to **Completed** per `docs/portfolio.md` §1c, as
substantive functional work:

- **Multi-Agent Role Contract** — `WorkflowAgentController` adds
  `GET /workspaces/:id/workflow-agents`, a read-only HTTP view of the
  already-working `WorkflowAgentRegistry`; `pnpm validate:api:workflow-agents`.
- **Workflow Orchestrator** — `DefaultWorkflowOrchestrator` now produces the
  `"skipped"` step status and `"partial"` run status that had been declared
  in the type system but never reachable, via a `workflow.skipRoles` goal
  metadata key, plus bounded invoke retry (`MAX_STEP_INVOKE_ATTEMPTS`);
  `pnpm validate:workflow:orchestrator`.
- **Agent Handoff / Delegation** — a step's invoke result can set
  `delegateToAgentId` to steer execution to a different registered agent of
  the same role, instead of always the planner's fixed first pick;
  `pnpm validate:workflow:handoff`.

All five charter capabilities are now **Completed**. Per this update, the
project-level label moves from **CLOSED (Partial)** to **CLOSED** — the
same precedent already set by Project 2 (labeled plain `CLOSED` while some
infra adapters remain Partial; those are frozen infra, not capability gaps).
The Sprint-44-era historical record and the 2026-07-30 update above remain
unchanged as written; `docs/portfolio.md` §1c is the current source of
truth for P3 status.
