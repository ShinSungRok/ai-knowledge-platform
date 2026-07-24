# P3 — Multi-Agent Workflow Engine

**Why:** 단일 LLM 호출로 끝나지 않는 복잡한 업무를, 역할 기반 협업 **워크플로로 실행**하기 위해.

**What:** Backend **Workflow Engine** — Planner → Orchestrator → Handoff → Invoker → Shared Memory → Aggregation → Evaluation.

**How (run locally):**

```bash
# Fake invoker only (engine shape)
pnpm demo:workflow:engine

# Researcher → P2 InMemory cited-answer (portfolio bridge)
pnpm demo:workflow:p2-bridge

# Evaluation metrics (Fake / bridge) — no LLM-as-judge
pnpm demo:workflow:evaluation
pnpm demo:workflow:evaluation-bridge

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
# SKIP_DEMO_SEED=1 → Fake-only unless WORKFLOW_P2_BRIDGE=1

curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/workflow-runs \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"objective":"aaaaaaaa"}'
```

Expect HTTP 200 with `status: "completed"`, `workflowRunId`, and three `stepResults`.
Without Bearer → 401. Smoke: `pnpm validate:server:start-smoke` (includes workflow-runs).

포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

---

## 엔진 파이프라인

```text
Goal
  → Planner (DeterministicWorkflowPlanner)
  → Orchestrator (DefaultWorkflowOrchestrator)
      → resolve role agent (Registry)
      → Handoff (sequential / delegation)
      → Invoker (Fake or KnowledgeAnswerWorkflowAgentInvoker)
      → Shared Workflow Memory (append-only)
  → Run result (aggregation)
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
| Invoker | `KnowledgeAnswerWorkflowAgentInvoker` (researcher → knowledge; else Fake) |
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

---

## 검증 (증거)

```bash
pnpm validate:workflow:contract
pnpm validate:workflow:registry
pnpm validate:workflow:orchestrator
pnpm validate:workflow:handoff
pnpm validate:workflow:memory
pnpm validate:workflow:evaluation
pnpm validate:workflow:knowledge-invoker
pnpm validate:workflow:p2-bridge
pnpm validate:application:eval-workflow
```

모듈: `app/knowledge/workflow` (+ bridge/evaluation wiring in `composition`).

---

## 가상 시나리오 (한 줄)

보안 정책 요지 + 리스크 한 줄 요청  
→ researcher가 P2 cited-answer로 조사 → synthesizer 초안 → critic 검토  
→ memory에 objective / handoff / step_output 기록 → evaluation passRate=1.

---

## 면접 한 줄

> I implemented a multi-agent **workflow engine** and proved it **reuses** our knowledge serving layer: researcher steps call cited-answer through a port, with Fake-validated orchestration, handoff, shared run memory, and **deterministic workflow evaluation**—so complex work runs as a backend workflow, not a single prompt.
