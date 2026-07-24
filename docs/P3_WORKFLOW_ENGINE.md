# P3 — Multi-Agent Workflow Engine

**Why:** 단일 LLM 호출로 끝나지 않는 복잡한 업무를, 역할 기반 협업 **워크플로로 실행**하기 위해.

**What:** Backend **Workflow Engine** — Planner → Orchestrator → Handoff → Invoker → Shared Memory → Aggregation → Evaluation.

**How (run locally):**

```bash
pnpm demo:workflow:engine
```

콘솔에 plan / step handoff / shared memory가 출력됩니다 (Fake invoker, Docker 불필요).

포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

---

## 엔진 파이프라인

```text
Goal
  → Planner (DeterministicWorkflowPlanner)
  → Orchestrator (DefaultWorkflowOrchestrator)
      → resolve role agent (Registry)
      → Handoff (sequential / delegation)
      → Invoker (Fake or real adapters)
      → Shared Workflow Memory (append-only)
  → Run result (aggregation)
  → Workflow evaluation (separate validators)
```

| Role (예) | 책임 |
|---|---|
| coordinator | 목표 분해·위임 |
| researcher | 조사·근거 수집 |
| synthesizer | 초안·요약 |
| critic | 검토·리스크 |
| executor | 최종 산출 |

P2와의 관계: Workflow Engine은 **실행 계층**. Knowledge Serving(P2)을 도구/지식으로 **재사용**하는 설계 (벤더 LLM 고르기가 아님).

---

## 검증 (증거)

```bash
pnpm validate:workflow:contract
pnpm validate:workflow:registry
pnpm validate:workflow:orchestrator
pnpm validate:workflow:handoff
pnpm validate:workflow:memory
pnpm validate:workflow:evaluation
```

모듈: `app/knowledge/workflow`.

---

## 가상 시나리오 (한 줄)

보안 정책 요지 + 리스크 한 줄 요청  
→ researcher 조사 → synthesizer 초안 → critic 검토 → (executor) 확정  
→ memory에 objective / handoff / step_output 기록.

---

## 면접 한 줄

> I implemented a multi-agent **workflow engine**: deterministic planning, orchestration with sequential/delegation handoff, shared run memory, and Fake-validated execution—so complex work runs as a backend workflow, not a single prompt.
