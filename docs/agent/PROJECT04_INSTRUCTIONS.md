# PROJECT04_INSTRUCTIONS.md

> AI Knowledge Platform — Project 4 Core Charter  
> Version: 1.0  
> Status: Closed (historical)  
> Applies To: Historical Project 4 Enterprise LLMOps charter reference  
> Last Updated: 2026-07-23

---

## 1. 문서 목적과 우선순위

이 문서는 Project 4에서 적용했던 **핵심 개발 헌장**이다 (Sprint 51 closeout
이후 **Closed (historical)**).

Project 4: **CLOSED (Partial)** — 다섯 LLMOps charter capability는 각각
**Partial**이며 Completed로 승격하지 않는다. Project 2 CLOSED / Project 3
CLOSED (Partial) / Partial≠Completed 서술을 되돌리지 않는다. Project 4를
Active로 재개하지 않는다. 이 closeout에서 **Project 5 / PROJECT05 헌장을
신설하지 않는다**.

Agent 역할, Skill 선택, 운영 규칙이 필요한 경우에만
`docs/agent/AGENT_OPERATIONS_GUIDE.md`를 참조한다.

```text
사용자의 현재 Task
        ↓
docs/agent/PROJECT04_INSTRUCTIONS.md
        ↓
승인된 구현 계획
        ↓
docs/agent/AGENT_OPERATIONS_GUIDE.md
        ↓
개별 Skill 기본 동작
```

Project 2 헌장(`PROJECT02_INSTRUCTIONS.md`)과 Project 3 헌장
(`PROJECT03_INSTRUCTIONS.md`)은 **Closed (historical)**이다. 이 문서도
**Closed (historical)**이다. Project 2 CLOSED / Project 3 CLOSED (Partial) /
Project 4 CLOSED (Partial) / Partial≠Completed 서술을 되돌리지 않는다.

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
Project 4  Enterprise LLMOps Platform (CLOSED Partial)
```

Project 4는 Project 2 Knowledge / MCP / Agent 플랫폼과 Project 3
Multi-Agent workflow 경계 위에 **Enterprise LLMOps Platform**을 확립했다
(Sprint 51: CLOSED Partial).

증명할 역량(목표):

- Experiment / Run Tracking
- Prompt & Model Registry
- Evaluation Gates / Regression Harness
- Deployment / Serving Configuration
- LLMOps Observability (quality / cost / latency)
- (Project 2/3에서 이어지는) Backend / AI / Search / Platform / Workflow 기반

---

## 3. 핵심 범위 (헌장 수준 — Charter Skeleton에서는 미구현)

```text
Experiment / Run Tracking
Prompt & Model Registry
Evaluation Gates / Regression Harness
Deployment / Serving Configuration
LLMOps Observability
```

Charter Skeleton 단계에서는 위 항목을 **문서·상태(Not Started)**로만
기록한다. LLMOps 제품/런타임 구현은 이후 Sprint에서 한다.

- Evaluation Gates는 기존 `evaluation` / workflow evaluation을 **확장**한다.
  Charter skeleton에서 LLM-as-judge를 요구하지 않는다.
- LLMOps Observability는 기존 OTLP / metrics 경계를 **확장**한다.
  Official OpenTelemetry / vendor SaaS SDK는 여전히 deferred이다.

현재 Task와 무관한 기능을 미리 구현하지 않는다. 미래 확장은 고려하되
YAGNI를 지킨다.

---

## 4. Skeleton 단계 Non-goals

이번 Charter Skeleton(및 명시적으로 제외된 후속 작업 전까지)에 포함하지
않는다.

- 이 Sprint에서 Experiment tracker / Prompt·Model registry / Evaluation
  gates / Deployment config / LLMOps observability **제품·런타임 코드** 구현
- Project 2 또는 Project 3를 Active로 재오픈
- Partial → Completed 승격 (Project 2 infra Partial, Project 3 Multi-Agent
  Partial 포함)
- Express / Fastify
- Full OIDC authorization-code login / JWT-OIDC SDKs
- Official vendor LLMOps SaaS SDKs를 hard dependency로 추가
- Official SDKs (`@opentelemetry/*`, OpenSearch JS, LLM vendor SDKs, MCP SDK)
  를 default validate 경로에 강제
- Full W3C propagator suite / `prom-client`를 default path에 강제

---

## 5. 최상위 원칙

```text
Architecture First
Reuse First
Knowledge / Workflow / LLMOps First
Validation First
Production First
```

반드시 지킨다.

1. 기존 Project 2/3 구현과 추상화를 먼저 검토한다.
2. 교체보다 확장을 우선한다.
3. 관련 없는 리팩토링을 하지 않는다.
4. 중복 구현을 하지 않는다.
5. 불필요한 Framework와 Dependency를 추가하지 않는다.
6. Task 범위를 임의로 확장하지 않는다.
7. 검증하지 않은 성공을 주장하지 않는다.
8. Commit 후 추가 구현을 하지 않는다.

---

## 6. 아키텍처 계승 (Project 2/3와 동일)

- Clean Architecture / Hexagonal / DDD
- Ports & Adapters
- Composition Root에서만 concrete wiring
- Domain: zero outward dependencies
- Application: use cases / workflows over ports
- Validation runners (dependency-free `tsx`)
- Runtime Validation / Evaluation 체계 확장 가능

완료된 Project 2/3 구조를 이유 없이 재설계하거나 다시 작성하지 않는다.

### Reuse First (필수 재사용 기반)

Project 4는 다음 모듈을 **재사용·확장**한다 (rewrite 금지):

- `app/knowledge/evaluation` — RAG / run evaluators (gates harness 기반)
- `app/knowledge/observability` — OTLP / metrics 경계 (LLMOps signals 확장)
- `app/knowledge/jobs` — background / batch job boundaries
- `app/knowledge/ai` — HTTP LLM 및 Fake LLM 경로
- `app/knowledge/composition` — composition root
- `app/knowledge/workflow` — Project 3 Multi-Agent workflow (Partial)
- `app/knowledge/application` — use cases over ports

---

## 7. Validation First

- Correctness는 dependency-free `tsx` validation runner로 증명한다.
- Default `pnpm validate`는 Fake / in-memory 경로를 유지한다 (Docker /
  live network / API keys 불필요).
- Optional live runners는 env unset 시 skip하며 top-level validate에
  넣지 않는다.
- 검증 성공 전에는 Commit하지 않는다.
- Project 2 final-closeout / Project 3 closeout validators는 계속 통과해야
  한다 (CLOSED 서술 보존).

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
- Task당 하나의 focused commit (Progress Log 해시 기록은 후속 docs commit
  허용)
- 검증 실패 시 Commit하지 않는다
- Commit 후 해당 Task의 추가 구현을 하지 않는다
- Project 2/3 CLOSED 서술과 무관한 임의 커밋을 하지 않는다

---

## 10. Progress / Roadmap

- Progress: `docs/progress/PROJECT04_PROGRESS.md`
- Roadmap: `docs/progress/PROJECT04_ROADMAP_STATUS.md`
- Project 3 historical: `docs/progress/PROJECT03_*` (CLOSED Partial — 재오픈 금지)
- Project 2 historical: `docs/progress/PROJECT02_*` (CLOSED — 재오픈 금지)
