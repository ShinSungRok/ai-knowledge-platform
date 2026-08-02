# P3 — Multi-Agent Workflow Engine

**Why:** 단일 LLM 호출로 끝나지 않는 복잡한 업무를, 역할 기반 협업 **워크플로로 실행**하기 위해.

**What:** Backend **Workflow Engine** — Planner → Orchestrator → Handoff → Invoker → Shared Memory → Aggregation → Evaluation.

**How (run locally):**

```bash
# Fake invoker only (engine shape)
pnpm demo:workflow:engine

# Researcher → P2 InMemory cited-answer (portfolio bridge)
pnpm demo:workflow:p2-bridge

# Evaluation metrics (Fake / bridge, deterministic — structural only)
pnpm demo:workflow:evaluation
pnpm demo:workflow:evaluation-bridge

# LLM-as-judge content evaluation (Fake LLM — shows the honest no-op path;
# see validate:workflow:content-evaluation for the real scoring behavior)
pnpm demo:workflow:content-evaluation

# Thin HTTP on same host as P2 service (Later)
pnpm start
```

콘솔에 plan / step handoff / shared memory / evaluation metrics가 출력됩니다 (Docker/키 불필요).

### Call via `pnpm start` (Later — Thin Workflow HTTP)

Same `NodeHttpListener` host as cited-answers (no Express). Bearer + workspace AuthZ.

```bash
pnpm start
# STORE / VECTOR / LLM / WORKFLOW logs on boot
# Default: demo seed on → WORKFLOW: fake+p2-bridge (researcher uses cited-answer)
# LLM_API_KEY set → WORKFLOW: …+agent-llm (synthesizer/critic use HTTP LLM)
# SKIP_DEMO_SEED=1 → Fake-only unless WORKFLOW_P2_BRIDGE=1

curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/workflow-runs \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"objective":"aaaaaaaa"}'
```

Expect HTTP 200 with `status: "completed"`, `workflowRunId`, and three `stepResults`.
With HTTP LLM: synthesizer/critic outputs are model text (not `echo:…`).
Without Bearer → 401. Smoke: `pnpm validate:server:start-smoke` (includes workflow-runs).

The returned `workflowRunId` is persisted and can be fetched later, along
with its Shared Workflow Memory:

```bash
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/workflow-runs/<workflowRunId> \
  -H 'Authorization: Bearer demo-key'

curl -sS http://127.0.0.1:8080/workspaces/workspace-a/workflow-runs/<workflowRunId>/memory \
  -H 'Authorization: Bearer demo-key'
```

Expect HTTP 200 for both (404 for an unknown run id, 401 without Bearer, 403
for the wrong workspace) — same as the P2 Knowledge Bridge / Workflow
Evaluation pattern below.

The registered Multi-Agent Role Contract is also inspectable over HTTP
(process-global, not workspace-scoped — every authorized workspace sees the
same list):

```bash
curl -sS http://127.0.0.1:8080/workspaces/workspace-a/workflow-agents \
  -H 'Authorization: Bearer demo-key'
```

Expect HTTP 200 with an `agents` array of 3 descriptors (401 without Bearer).

포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

---

## 엔진 파이프라인

```text
Goal (metadata may name workflow.skipRoles)
  → Planner (DeterministicWorkflowPlanner)
  → Orchestrator (DefaultWorkflowOrchestrator)
      → skip? (role in workflow.skipRoles → status="skipped", no invoke)
      → resolve role agent (Registry; agent-requested delegateToAgentId overrides the planner's pick)
      → Handoff (sequential / delegation) — built from the last *completed* step
      → Invoker (Fake / KnowledgeAnswer / LanguageModel for synth+critic), retried up to MAX_STEP_INVOKE_ATTEMPTS
      → Shared Workflow Memory (append-only)
  → Run result (aggregation: completed / partial / failed)
  → Workflow evaluation (DefaultWorkflowRunEvaluator / RunWorkflowEvaluationUseCase)
```

| Role (예) | 책임 |
|---|---|
| coordinator | 목표 분해·위임 |
| researcher | 조사·근거 수집 (**P2 cited-answer 재사용 가능**) |
| synthesizer | 초안·요약 |
| critic | 검토·리스크 |
| executor | 최종 산출 |

P2와의 관계: Workflow Engine은 **실행 계층**. Knowledge Serving(P2)을 도구/지식으로 **재사용**하는 설계 (벤더 LLM 고르기가 아님).

### P2 Knowledge Bridge (Phase A 증거)

| Item | Detail |
|---|---|
| Port | `WorkflowKnowledgeAnswerPort` |
| Invoker | `KnowledgeAnswerWorkflowAgentInvoker` (researcher → knowledge) + optional `LanguageModelWorkflowAgentInvoker` (synthesizer/critic → LLM when `LLM_API_KEY` set); else Fake |
| Demo | `pnpm demo:workflow:p2-bridge` |
| Validator | `pnpm validate:workflow:p2-bridge` |

Researcher step output 형식: `knowledge:grounded:citations=N:<answer text>`.

### Workflow Evaluation (Phase B 증거)

| Item | Detail |
|---|---|
| Evaluator | `DefaultWorkflowRunEvaluator` (deterministic; no LLM-as-judge) |
| Use case | `RunWorkflowEvaluationUseCase` |
| Demo | `pnpm demo:workflow:evaluation` · `pnpm demo:workflow:evaluation-bridge` |
| Validator | `pnpm validate:workflow:evaluation` · `pnpm validate:application:eval-workflow` |

Metrics: `passRate` / `passedCount` / per-case `failureReasons`.

### HTTP Multi-Agent API (Phase C evidence — Shared Workflow Memory → Completed)

| Item | Detail |
|---|---|
| Store | `WorkflowRunStore` / `InMemoryWorkflowRunStore` — persists each POSTed run's result, keyed by `workflowRunId` |
| Routes | `GET /workspaces/:id/workflow-runs/:runId` (persisted run), `GET /workspaces/:id/workflow-runs/:runId/memory` (Shared Workflow Memory entries) |
| Validator | `pnpm validate:workflow:run-store`, `validate:api:workflow-run`, `validate:composition:listening-operations` |

Both new routes follow the same Bearer + workspace-authorized cascade as
`POST .../workflow-runs`: 401 without Bearer, 403 for the wrong workspace,
404 for an unknown run id or when the store isn't wired, 200 on success.

### LLM-as-judge Multi-Agent Evaluation (Phase D evidence — Multi-Agent Evaluation → Completed)

| Item | Detail |
|---|---|
| Evaluator | `LlmWorkflowRunContentEvaluator` implementing async `WorkflowRunContentEvaluator` — reuses the same `LanguageModelProvider` as cited-answers (no new dependency) |
| Use case | `RunWorkflowContentEvaluationUseCase` |
| Demo | `pnpm demo:workflow:content-evaluation` (Fake LLM — shows the honest no-op path) |
| Validator | `pnpm validate:workflow:content-evaluation`, `validate:application:eval-workflow-content` |

Judges whether a run's actual step-output content substantively satisfies
its objective — content judgment the deterministic `DefaultWorkflowRunEvaluator`
structurally cannot make (status/step-count/roles/handoff/memory presence
only, never what an agent actually wrote). One LLM call per case; a missing
run or unparseable LLM response counts as content-failed, never a silent
pass.

### Multi-Agent Role Contract HTTP (Phase E evidence — Role Contract → Completed)

| Item | Detail |
|---|---|
| Route | `GET /workspaces/:id/workflow-agents` — read-only view of `WorkflowAgentRegistry.listAll()` |
| Controller | `WorkflowAgentController` (Bearer + workspace-authorized, same cascade as `WorkflowRunController`) |
| Validator | `pnpm validate:api:workflow-agents`, extended `validate:composition:listening-operations` |

The registry is process-global, not workspace-scoped: every authorized
workspace sees the same registered agent list. `:workspaceId` in the path
only gates AuthZ, it does not filter agents.

### Conditional Execution + Bounded Retry (Phase F evidence — Workflow Orchestrator → Completed)

| Item | Detail |
|---|---|
| Skip | `WorkflowGoal.metadata["workflow.skipRoles"]` (comma-separated roles) → matching steps get status `"skipped"`, never invoked, never block the run |
| Retry | Invoke failures (throw or `ok:false`) retry once (`MAX_STEP_INVOKE_ATTEMPTS = 2`); structural failures (unknown agent, role mismatch, handoff-build throw) are never retried |
| Status | `WorkflowRunStatus` now actually produces `"partial"` (mix of completed/skipped, no failures) alongside `"completed"`/`"failed"` |
| Validator | `pnpm validate:workflow:orchestrator` (10 scenarios: skip, retry-success, retry-exhausted, all-skipped, step-0-skip, plus the original 5) |

Handoff for the step *after* a skipped one is still built from the last
**completed** step, not the skipped one — skipping never corrupts the
downstream handoff chain.

### Dynamic Agent Delegation (Phase G evidence — Agent Handoff/Delegation → Completed)

| Item | Detail |
|---|---|
| Signal | `WorkflowAgentInvokeResult.delegateToAgentId` — an agent-initiated request naming a registered agent of the *same role* as the next planned step |
| Behavior | `DefaultWorkflowOrchestrator` resolves and invokes that agent instead of the planner's fixed first pick; falls back silently to the planned agent when the id is unregistered or wrong-role |
| Validator | `pnpm validate:workflow:handoff` (adds: delegation to a second registered same-role agent, fallback on invalid target) |

This makes delegation genuinely agent-driven, not just a static
`(previousRole, nextRole)` label on a fixed edge.

---

## 검증 (증거)

```bash
pnpm validate:workflow:contract
pnpm validate:workflow:registry
pnpm validate:workflow:orchestrator
pnpm validate:workflow:handoff
pnpm validate:workflow:memory
pnpm validate:workflow:run-store
pnpm validate:workflow:evaluation
pnpm validate:workflow:content-evaluation
pnpm validate:workflow:knowledge-invoker
pnpm validate:workflow:p2-bridge
pnpm validate:application:eval-workflow
pnpm validate:application:eval-workflow-content
pnpm validate:api:workflow-agents
```

모듈: `app/knowledge/workflow` (+ bridge/evaluation wiring in `composition`).

---

## 가상 시나리오 (한 줄)

보안 정책 요지 + 리스크 한 줄 요청  
→ researcher가 P2 cited-answer로 조사 → synthesizer 초안 → critic 검토  
→ memory에 objective / handoff / step_output 기록 → evaluation passRate=1.

---

## 면접 한 줄

> I implemented a multi-agent **workflow engine** and proved it **reuses** our knowledge serving layer: researcher steps call cited-answer through a port, with Fake-validated orchestration, handoff, shared run memory, and both **deterministic and LLM-as-judge workflow evaluation**—plus a full run/memory/agent-registry HTTP API, conditional step skipping with bounded retry and a real partial-completion status, and genuine agent-initiated dynamic delegation among multiple registered agents of the same role—so complex work runs as an operable, resilient backend workflow, not a single prompt.
