# Project 3 Roadmap Status

> Enterprise AI Workflow — Multi-Agent  
> **Active — Role Contract + Orchestrator + Handoff + Shared Memory Partial** — Sprint 42

## Status

**Project 3 — Active — Role Contract + Orchestrator + Handoff + Shared Memory
Partial.** Charter Skeleton (Sprint 38) remains the foundation. Multi-Agent
Role Contract, Workflow Orchestrator, and Agent Handoff / Delegation are
**Partial**. Shared Workflow Memory is **Partial**
(`WorkflowMemoryStore` / `InMemoryWorkflowMemoryStore` write-only append from
`DefaultWorkflowOrchestrator`; `pnpm validate:workflow:memory`). Distinct from
Project 2 session `MemoryStore`. Multi-Agent Evaluation remains **Not Started**.

**Project 2 remains CLOSED** (Sprint 37). Partial infrastructure adapters from
Project 2 stay Partial — not Completed. Do not reopen Project 2 tracks.

## Reuse from Project 2

- Clean / Hexagonal / DDD modules and composition-only wiring
- `app/knowledge/agent` — single-agent planner / executor / reviewer / orchestrator
- `app/knowledge/mcp` / `tools` — tool registry and tool calling
- `app/knowledge/memory` — session memory (not Knowledge search; not replaced by workflow memory)
- `app/knowledge/application` / `composition` — use cases and composition root
- Dependency-free `tsx` validation runners and static closeout validators
- Optional Partial infra (Postgres, OpenSearch, HTTP LLM, OTLP, JWT, Prometheus,
  MCP HTTP + stdio) as Fake-validated paths

## Charter capabilities (planned)

| Capability | Status | Notes |
|---|---|---|
| Multi-Agent Role Contract | **Partial** | `workflow` module: roles/descriptors + InMemory registry; `pnpm validate:workflow:contract` / `validate:workflow:registry` |
| Workflow Orchestrator | **Partial** | `DeterministicWorkflowPlanner` + `DefaultWorkflowOrchestrator` + `FakeWorkflowAgentInvoker`; `pnpm validate:workflow:orchestrator` |
| Agent Handoff / Delegation | **Partial** | `WorkflowHandoff` / `DefaultWorkflowHandoffBuilder`; runtime handoff overrides step input after step 0; `pnpm validate:workflow:handoff` |
| Shared Workflow Memory | **Partial** | `WorkflowMemoryStore` / `InMemoryWorkflowMemoryStore`; orchestrator appends objective/handoff/step_output; `pnpm validate:workflow:memory` |
| Multi-Agent Evaluation | Not Started | Evaluation of multi-agent runs |

## Explicit non-goals (current)

- Multi-Agent Evaluation runtime / reading memory into invoker prompts
- Official SDKs, Express/Fastify, full OIDC login, full W3C propagator
- Reopening Project 2 CLOSED tracks or promoting Partial → Completed
- Conflating Project 2 `AgentRole` / session `MemoryStore` with workflow memory
- Application/HTTP multi-agent API wiring / SQL workflow memory

## Task range

| Range | Scope |
|---|---|
| Sprint 38 (Task 158–161) | Establish Project 3 Charter Skeleton (PROJECT03 instructions, Progress/Roadmap stubs, agent ops pointers, static skeleton validator) |
| Sprint 39 (Task 162–165) | Establish Multi-Agent Role Contract (`workflow` ports + InMemory registry + validators; Partial) |
| Sprint 40 (Task 166–169) | Establish Workflow Orchestrator (goal/plan/invoker/orchestrator + Fake validation; Partial) |
| Sprint 41 (Task 170–173) | Establish Agent Handoff / Delegation (contract + builder + orchestrator wiring + validators; Partial) |
| Sprint 42 (Task 174–177) | Establish Shared Workflow Memory (contract + InMemory store + orchestrator append + validators; Partial) |

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

## Sprint 41 close note

**Sprint 41 — Establish Agent Handoff / Delegation: CLOSED.** Tasks 170–173
delivered `WorkflowHandoff` contract, `DefaultWorkflowHandoffBuilder`,
orchestrator wiring (step0 objective; later steps handoff payload), and
`pnpm validate:workflow:handoff`. Shared Memory / Multi-Agent Evaluation
remain **Not Started**. Project 2 remains **CLOSED**.

## Sprint 42 close note

**Sprint 42 — Establish Shared Workflow Memory: CLOSED.** Tasks 174–177
delivered `WorkflowMemoryStore` / `InMemoryWorkflowMemoryStore`, orchestrator
write-only appends, and `pnpm validate:workflow:memory`. Multi-Agent
Evaluation remains **Not Started**. Project 2 remains **CLOSED**.
