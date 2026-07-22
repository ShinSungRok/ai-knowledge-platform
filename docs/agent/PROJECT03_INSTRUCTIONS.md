# PROJECT03_INSTRUCTIONS.md

> AI Knowledge Platform — Project 3 Core Charter  
> Version: 1.0  
> Status: Closed (historical)  
> Applies To: Historical Project 3 Multi-Agent charter reference  
> Last Updated: 2026-07-22

---

## 1. 문서 목적과 우선순위

이 문서는 Project 3에서 적용했던 **핵심 개발 헌장**이다 (Sprint 44 closeout
이후 **Closed (historical)**).

신규 제품 작업은 Project 3 CLOSED (Partial) 이후 **Project 4 — Enterprise
LLMOps Platform** 헌장이 마련될 때까지 Project 3를 Active로 재개하지 않는다.
Project 2 CLOSED / Partial≠Completed 서술을 되돌리지 않는다.

Agent 역할, Skill 선택, 운영 규칙이 필요한 경우에만
`docs/agent/AGENT_OPERATIONS_GUIDE.md`를 참조한다.

```text
사용자의 현재 Task
        ↓
docs/agent/PROJECT03_INSTRUCTIONS.md
        ↓
승인된 구현 계획
        ↓
docs/agent/AGENT_OPERATIONS_GUIDE.md
        ↓
개별 Skill 기본 동작
```

Project 2 헌장(`PROJECT02_INSTRUCTIONS.md`)은 **Closed (historical)**이다.
신규 작업의 상위 헌장은 이 문서(PROJECT03, Closed historical)이다. Project 4
charter가 마련되기 전까지 Project 3를 Active로 재개하지 않는다. Project 2 CLOSED /
Partial≠Completed 서술을 되돌리지 않는다.

현재 Task가 이 문서의 아키텍처·안전·검증 원칙과 충돌하면 즉시 구현하지
말고 충돌 이유와 대안을 보고한다.

---

## 2. 프로젝트 정체성

```text
Project 1  Public Law AI — Grounded RAG (완료)
    ↓
Project 2  AI Knowledge Platform — Knowledge + MCP + Agent (CLOSED)
    ↓
Project 3  Enterprise AI Workflow — Multi-Agent (CLOSED Partial)
    ↓
Project 4  Enterprise LLMOps Platform (handoff / next)
```

Project 3는 Project 2에서 검증된 Knowledge / MCP / Tool / single-Agent /
Memory / Evaluation / Operations 플랫폼 위에 **Enterprise AI Workflow —
Multi-Agent**를 확립한다.

증명할 역량(목표):

- Multi-Agent Engineering
- Workflow Orchestration
- Agent Handoff / Delegation
- Shared Workflow Memory boundaries
- Multi-Agent Evaluation
- (Project 2에서 이어지는) Backend / AI / Search / Platform / DevOps 기반

---

## 3. 핵심 범위 (헌장 수준 — Charter Skeleton에서는 미구현)

```text
Multi-Agent Role Contract
Workflow Orchestrator
Agent Handoff / Delegation
Shared / Workspace Workflow Memory
Multi-Agent Run Evaluation
```

Charter Skeleton 단계에서는 위 항목을 **문서·상태(Not Started)**로만
기록한다. 제품 Multi-Agent 런타임 구현은 이후 Sprint에서 한다.

현재 Task와 무관한 기능을 미리 구현하지 않는다. 미래 확장은 고려하되
YAGNI를 지킨다.

---

## 4. Skeleton 단계 Non-goals

이번 Charter Skeleton(및 명시적으로 제외된 후속 작업 전까지)에 포함하지
않는다.

- Full OIDC authorization-code login / JWT-OIDC SDKs
- Express / Fastify
- Official SDKs (`@opentelemetry/*`, OpenSearch JS, LLM vendor SDKs, MCP SDK)
- Full W3C propagator suite / `prom-client`
- 이 Sprint에서 multi-agent orchestrator / handoff / evaluation **코드** 구현
- Project 2 CLOSED track 재오픈 또는 Partial → Completed 승격

---

## 5. 최상위 원칙

```text
Architecture First
Reuse First
Knowledge / Workflow First
Validation First
Production First
```

반드시 지킨다.

1. 기존 Project 2 구현과 추상화를 먼저 검토한다.
2. 교체보다 확장을 우선한다.
3. 관련 없는 리팩토링을 하지 않는다.
4. 중복 구현을 하지 않는다.
5. 불필요한 Framework와 Dependency를 추가하지 않는다.
6. Task 범위를 임의로 확장하지 않는다.
7. 검증하지 않은 성공을 주장하지 않는다.
8. Commit 후 추가 구현을 하지 않는다.

---

## 6. 아키텍처 계승 (Project 2와 동일)

- Clean Architecture / Hexagonal / DDD
- Ports & Adapters
- Composition Root에서만 concrete wiring
- Domain: zero outward dependencies
- Application: use cases / workflows over ports
- Validation runners (dependency-free `tsx`)
- Runtime Validation / Evaluation 체계 확장 가능

완료된 Project 2 구조를 이유 없이 재설계하거나 다시 작성하지 않는다.

### Reuse First (필수 재사용 기반)

Project 3는 다음 Project 2 모듈을 **재사용·확장**한다 (rewrite 금지):

- `app/knowledge/agent` — planner / step-executor / reviewer / orchestrator
  (single-agent; multi-agent collaboration은 이후 charter capability)
- `app/knowledge/mcp` / `tools` — capability exposure & tool calling
- `app/knowledge/memory` — session memory (Knowledge 검색과 분리)
- `app/knowledge/application` / `composition` — use cases & composition root

---

## 7. Validation First

- Correctness는 dependency-free `tsx` validation runner로 증명한다.
- Default `pnpm validate`는 Fake / in-memory 경로를 유지한다 (Docker /
  live network / API keys 불필요).
- Optional live runners는 env unset 시 skip하며 top-level validate에
  넣지 않는다.
- 검증 성공 전에는 Commit하지 않는다.

---

## 8. 표준 작업 흐름

```text
Review
→ Reuse
→ Design
→ Implement
→ Validate
→ Diff Review
→ Commit
→ Stop
```

Planning Agent는 코드를 수정하지 않고 구조화된 Sprint/Task Prompt를
작성한 뒤 멈춘다. Developer Agent는 승인된 Sprint 범위만 구현하고,
Task마다 Validation → Progress Log → Diff Review → Commit을 수행한다.
Sprint 완료 후 `pnpm validate` → Sprint Report → Stop.

---

## 9. Commit 규칙

- Conventional Commits (`feat(scope):`, `chore(scope):`, `docs(scope):`)
- Task당 하나의 focused commit (Progress Log 포함)
- 검증 실패 시 Commit하지 않는다
- Commit 후 해당 Task의 추가 구현을 하지 않는다
- Project 2 ops dirty files와 무관한 임의 커밋을 하지 않는다

---

## 10. Progress / Roadmap

- Progress: `docs/progress/PROJECT03_PROGRESS.md`
- Roadmap: `docs/progress/PROJECT03_ROADMAP_STATUS.md`
- Project 2 historical: `docs/progress/PROJECT02_*` (CLOSED — 재오픈 금지)
