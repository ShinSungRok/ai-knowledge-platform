# Project 3 Roadmap Status

> Enterprise AI Workflow — Multi-Agent  
> **Active — Role Contract + Workflow Orchestrator Partial** — Sprint 40

## Status

**Project 3 — Active — Role Contract + Workflow Orchestrator Partial.**
Charter Skeleton (Sprint 38) remains the foundation. Multi-Agent Role Contract
is **Partial**. Workflow Orchestrator is **Partial** (Deterministic planner +
Default orchestrator + Fake invoker validated). Agent Handoff/Delegation,
Shared Workflow Memory, and Multi-Agent Evaluation remain **Not Started**.

**Project 2 remains CLOSED** (Sprint 37). Partial infrastructure adapters from
Project 2 stay Partial — not Completed. Do not reopen Project 2 tracks.

## Reuse from Project 2

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/agent` — single-agent planner / executor / reviewer / orchestrator
- `app/knowledge/mcp` / `tools` — tool registry and tool calling
- `app/knowledge/memory` — session memory (not Knowledge search)
- `app/knowledge/application` / `composition` — use cases and composition root
- Dependency-free `tsx` validation runners and static closeout validators
- Optional Partial infra (Postgres, OpenSearch, HTTP LLM, OTLP, JWT, Prometheus,
  MCP HTTP + stdio) as Fake-validated paths

## Charter capabilities (planned)

| Capability | Status | Notes |
|---|---|---|
| Multi-Agent Role Contract | **Partial** | `workflow` module: roles/descriptors + InMemory registry; `pnpm validate:workflow:contract` / `validate:workflow:registry` |
| Workflow Orchestrator | **Partial** | `DeterministicWorkflowPlanner` + `DefaultWorkflowOrchestrator` + `FakeWorkflowAgentInvoker`; `pnpm validate:workflow:orchestrator`; no Handoff/Shared Memory |
| Agent Handoff / Delegation | Not Started | Explicit handoff contracts between agents |
| Shared Workflow Memory | Not Started | Workspace/workflow-scoped shared memory boundaries |
| Multi-Agent Evaluation | Not Started | Evaluation of multi-agent runs |

## Explicit non-goals (current)

- Explicit Handoff message types / Shared Workflow Memory / Multi-Agent Evaluation
- Official SDKs, Express/Fastify, full OIDC login, full W3C propagator
- Reopening Project 2 CLOSED tracks or promoting Partial → Completed
- Conflating Project 2 `AgentRole` with Multi-Agent `WorkflowAgentRole`
- Application/HTTP multi-agent API wiring

## Task range

| Range | Scope |
|---|---|
| Sprint 38 (Task 158–161) | Establish Project 3 Charter Skeleton (PROJECT03 instructions, Progress/Roadmap stubs, agent ops pointers, static skeleton validator) |
| Sprint 39 (Task 162–165) | Establish Multi-Agent Role Contract (`workflow` ports + InMemory registry + validators; Partial) |
| Sprint 40 (Task 166–169) | Establish Workflow Orchestrator (goal/plan/invoker/orchestrator + Fake validation; Partial) |

## Sprint 38 close note

**Sprint 38 — Establish Project 3 Charter Skeleton: CLOSED.** Tasks 158–161
delivered **Active (Charter Skeleton)** docs, Progress/Roadmap stubs, agent ops
pointers to PROJECT03, and `pnpm validate:project03:charter-skeleton`.
Multi-Agent product capabilities were **Not Started** at close. Project 2
remains **CLOSED**.

## Sprint 39 close note

**Sprint 39 — Establish Multi-Agent Role Contract: CLOSED.** Tasks 162–165
delivered `app/knowledge/workflow` Role Contract + InMemory registry,
dependency-free validators, and roadmap/portfolio Partial status.
Orchestrator / handoff / shared memory / multi-agent evaluation remain
deferred. Project 2 remains **CLOSED**.

## Sprint 40 close note

**Sprint 40 — Establish Workflow Orchestrator: CLOSED.** Tasks 166–169
delivered Workflow goal/plan/result ports, Fake invoker, Deterministic
planner, Default orchestrator, and `pnpm validate:workflow:orchestrator`.
Handoff / Shared Memory / Multi-Agent Evaluation remain **Not Started**.
Project 2 remains **CLOSED**.
