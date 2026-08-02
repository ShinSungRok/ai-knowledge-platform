# AI Knowledge Platform — 시스템 총평 보고

> 산출물: 프로젝트 전체 총평 · 논리 흐름 · 프로세스 · 설계 원리  
> 대상: P2 Knowledge Serving · P3 Workflow Engine · P4 LLMOps Control Plane  
> 일자: 2026-07-24 (2026-07-30 갱신: P2 리트리벌 품질 개선 — §11;
> 2026-07-31 갱신: P3/P4 5/5 Completed — §12/§13)  
> 저장소: https://github.com/ShinSungRok/ai-knowledge-platform

관련 문서: [`README.md`](../README.md) ·
[`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md) ·
[`architecture.md`](architecture.md) ·
[`P2_SERVICE_MANUAL.md`](P2_SERVICE_MANUAL.md) ·
[`P3_WORKFLOW_ENGINE.md`](P3_WORKFLOW_ENGINE.md) ·
[`P4_LLMOPS.md`](P4_LLMOPS.md)

---

## 1. 총평 (Executive Summary)

**결론:** 포트폴리오용 **AI Backend 플랫폼 시리즈의 큰 틀은 마무리**되었다.
Knowledge(기반) → Workflow(실행) → LLMOps(운영) 스토리와, 동일 호스트에서
돌릴 수 있는 HTTP 증거가 갖춰져 있다.

이것은 **엔터프라이즈 완제품 출시**를 의미하지 않는다. P2/P3/P4 모두
**CLOSED**이고, P3/P4는 5/5 charter capability가 **Completed**다
(2026-07-31 — §12/§13). 기본 증명은 Fake/InMemory 검증이고, 실 LLM·실측
latency는 **선택적 데모 경로**다. 일부 인프라 어댑터(Postgres/OpenSearch/
공식 OTLP SDK 등)는 여전히 **Partial**로 남아 있다 — Project 2 자체가
일부 infra Partial 상태로도 CLOSED 라벨을 쓰는 것과 같은 원칙.

| 관점 | 평가 |
|---|---|
| 포트폴리오 스토리 완성도 | 높음 — P1→P2→P3→P4 진화가 설명 가능 |
| 아키텍처 일관성 | 높음 — Clean/Hexagonal/DDD, composition root |
| 검증 가능 증명 | 높음 — `pnpm validate` 무의존 |
| 프로덕션 운영 성숙도 | 제한 — Partial 경계, Fake 임베딩, InMemory ops |
| 면접 설득력 | 충분 — Why/What/How + 실 curl 데모 |

**한 줄:**  
“완제품이 아니라, **팀이 소유할 수 있는 형태의 AI 백엔드 플랫폼 골격**을
Fake-증명하고, 실 LLM까지 같은 호스트에서 시연할 수 있게 만든 프로젝트.”

---

## 2. 논리 구조 (Logic Architecture)

### 2.1 시리즈 위치

```text
P1 Public Law AI          도메인 제품 (법률 Grounded RAG)
        ↓
P2 Knowledge Serving      지식 기반 (ingest → serve)
        ↓
P3 Workflow Engine        실행 엔진 (역할 협업)
        ↓
P4 LLMOps Control Plane   운영 평면 (버전·게이트·관측)
```

### 2.2 런타임 계층

```text
                    +---------------------------+
                    |  P4 LLMOps Control Plane  |
                    |  Registry · Gate · Serving|
                    |  Observation (soft-link)  |
                    +------------▲--------------+
                                 │ metrics / labels
             +-------------------+-------------------+
             │                                       │
             ▼                                       ▼
 +------------------------+           +------------------------+
 | P2 Knowledge Serving   |◄──────────| P3 Workflow Engine     |
 | Retrieve → Cite → LLM  |  reuse    | Plan → Handoff → Invoke|
 +-----------▲------------+           +-----------▲------------+
             │                                    │
             +----------------┬-------------------+
                              │
                              ▼
                 Client (curl / future UI)
                 pnpm start · NodeHttpListener
                 Bearer + Workspace AuthZ
```

### 2.3 요청 경로 (동일 호스트)

```mermaid
flowchart LR
  C[Client] --> H[pnpm start]
  H --> P2["POST /cited-answers"]
  H --> P3["POST /workflow-runs"]
  H --> P4["POST /llmops/control-plane"]
  P3 -->|researcher| P2
  P2 -.->|B-path latency| P4
```

| Endpoint | Plane | 인증 |
|---|---|---|
| `GET /health` | ops | 공개 |
| `POST /workspaces/:id/cited-answers` | P2 | Bearer |
| `POST /workspaces/:id/workflow-runs` | P3 | Bearer |
| `POST /workspaces/:id/llmops/control-plane` | P4 | Bearer |
| `POST /mcp` | P2 MCP | Bearer |

---

## 3. 프로세스 (Process Flows)

### 3.1 P2 — Cited Knowledge Serving

**목적:** 워크스페이스 지식을 근거로 인용 가능한 답을 서빙한다.

```text
[Seed/Ingest]
  Document → Chunk → Embed → VectorIndex
    (demo MFA/VPN 청크 + law.go.kr 실 조문 416개 스냅샷, additive)
        ↓
[Request] query
        ↓
Retrieve (keyword / vector / hybrid)
        ↓
Threshold filter (벡터/키워드 각각 — 무관 후보 제거)
        ↓
Normalized rerank → 최소 관련도 미만 제거
        ↓
LLM-judged rerank (같은 LanguageModelProvider가 후보 전체 0~10점 채점)
  → 임계값 미만 전부 제거 시 insufficientEvidence
        ↓
Assemble GroundingContext → Build GroundedPrompt
        ↓
LanguageModelProvider.generate
  (Fake 기본 | HTTP LLM when LLM_API_KEY)
        ↓
Assemble GroundedAnswer → Build Citations
        ↓
HTTP 200 CitedGroundedAnswer
```

**핵심 원리**

- 답은 모델 기억만이 아니라 **검색된 청크**에 grounded 되어야 한다.
- LLM은 `LanguageModelProvider` 포트 뒤 — Fake와 HTTP가 동일 use case를 탄다.
- 임베딩 기본은 Fake(문자 해시); `EMBEDDING_API_KEY` 설정 시 OpenAI 호환
  실 임베딩(1536차원, 기본 `text-embedding-3-large`) 사용 가능.
- 검색은 임계값 필터 + LLM 판정 재랭킹까지 거쳐야 근거로 인정된다 — 벡터
  유사도 하나만으로는 무관 질의 차단도, 유사 후보 중 정답 선별도 불충분
  (§11 참고).

### 3.2 P3 — Multi-Agent Workflow

**목적:** 목표를 역할 단위 스텝으로 나누어 실행한다.

```text
objective
  → DeterministicWorkflowPlanner
      (registered roles: researcher → synthesizer → critic)
  → DefaultWorkflowOrchestrator
      → Handoff (이전 step output → 다음 input)
      → Invoker stack (outer → inner):
          KnowledgeAnswerWorkflowAgentInvoker  (researcher → P2)
          LanguageModelWorkflowAgentInvoker    (synth/critic → LLM)
          FakeWorkflowAgentInvoker             (fallback echo)
      → InMemoryWorkflowMemoryStore (append-only)
  → WorkflowRunResult (stepResults[])
```

| Role | 책임 | 이 호스트에서의 구현 |
|---|---|---|
| researcher | 근거 수집 | P2 cited-answer bridge |
| synthesizer | 초안·요약 | HTTP LLM (키 있을 때) |
| critic | 리스크·공백 검토 | HTTP LLM (키 있을 때) |

**핵심 원리**

- Agent는 **정체성(role)** 이고, 실행은 **Invoker**가 한다.
- P3는 “어떤 벤더 LLM이 나은가”가 아니라 **워크플로 실행 계층**.
- critic은 지식을 재검색하지 않고 **이전 스텝 텍스트**만 비평할 수 있다.

### 3.3 P4 — LLMOps Control Plane

**목적:** 실행 위에 버전·평가·서빙설정·관측 스토리를 둔다.

```text
PromptRegistry + ModelRegistry
  → ExperimentRunStore (params soft-link + metrics)
  → EvaluationGateEvaluator (numeric rules)
  → RegressionHarness (baseline vs candidate)
  → ServingConfigStore (activate)
  → LlmopsObservationStore (quality / cost / latency)
```

**B-path (실측 헬퍼)**

```text
POST cited-answers  →  wall latencyMs (+ soft quality proxy)
        ↓
POST llmops/control-plane  { metrics, servingLabels from LLM_MODEL }
```

**핵심 원리**

- Control plane은 **실행기를 대체하지 않는다**. soft-link id와 메트릭만 다룬다.
- 기본 `{}`는 데모 통과 메트릭; B-path의 **latency는 벽시계 실측**.
- hitRate/MRR는 grounded 여부의 soft proxy — 풀 평가 스위트가 아님.

---

## 4. 설계 원리 (Principles)

| # | 원리 | 실천 |
|---|---|---|
| 1 | **Ports before adapters** | domain/application은 인터페이스만; composition만 배선 |
| 2 | **Fake-first validation** | `pnpm validate` = Docker/키/네트워크 불필요 |
| 3 | **Partial ≠ Completed** | 경계 증거를 Completed로 과장하지 않음 |
| 4 | **One composition root** | `app/knowledge/composition`만 구체 타입 import |
| 5 | **Reuse downward** | P3→P2 지식, P4→실행 메타; 상위가 하위를 대체하지 않음 |
| 6 | **No Express/Fastify** | `NodeHttpListener` + 자체 router |
| 7 | **Secrets out of git** | `.env` gitignore; 원격에 API 키 없음 |
| 8 | **No Project 5 by default** | 헌장 없이 범위 확장하지 않음 |

의존성 방향 (요약):

```text
domain (0 outward)
  ↑ repository / persistence / embedding / search / retrieval
  ↑ context / prompt / ai / rag / citation
  ↑ application
  ↑ api / http / server
  ↑ composition  ← only place that wires adapters
```

---

## 5. 상태 매트릭스

| Track | Status | 의미 |
|---|---|---|
| P2 Charter baseline | CLOSED | 플랫폼 골격 Completed |
| P2 Service Completion | Complete | `pnpm start` 등 인간 승인 트랙 |
| P3 Multi-Agent (5 caps) | CLOSED, all 5 Completed (2026-07-31) | Role Contract HTTP + Orchestrator skip/retry/partial + 동적 delegation까지 실측 |
| P3 Thin Workflow HTTP | Complete | Bearer `workflow-runs` |
| P4 LLMOps (5 caps) | CLOSED, all 5 Completed (2026-07-31) | 영속 스토어 + GET 라우트 6개 + gate definition 활성화까지 실측 |
| P4 Thin Control Plane HTTP | Complete | Bearer `control-plane` |
| Live LLM / live metrics | Demo path | 선택 env; 기본 validate와 분리 |

---

## 6. 실측 데모에서 확인된 사실 (2026-07)

| 시나리오 | 관측 | 해석 |
|---|---|---|
| P2 + Gemini + MFA 시드 | 200, evidence/citation | 실지식+실 LLM grounded serve |
| P3 workflow | researcher=`knowledge:…`, synth/critic 자연어 | Fake echo 제거, 역할 LLM 동작 |
| P4 `from-cited-answer` | `latencyMs≈3513`, `modelName=gemini-…` | 서빙 실측이 ops에 기록됨 |
| P2 리트리벌 정밀도 (2026-07-30) | 완전 무관 질의 → 100% `insufficientEvidence`; 어휘 중복만 있는 오답, 다의어(사용자=고용주/계정) 오답도 차단; 유사 후보 다수 중에서도 정답 조문이 항상 1위 | 임계값 필터(벡터/키워드) + 정규화 재랭킹 + LLM 판정 재랭킹 조합으로, 벡터 유사도 단독으로는 못 넘던 정밀도 한계 해결 |

한계를 같이 말할 것:

- 임베딩은 기본 Fake; `EMBEDDING_API_KEY` 설정 시 실 임베딩(선택 경로)
- P4 품질 메트릭은 soft proxy
- P4 저장은 2026-07-31부로 호스트 프로세스 생존 기간 동안 영속(composition
  singleton) — 이전의 "요청마다 버려짐"에서 바뀜; 단, 디스크/SQL 영속은
  아님 (재시작하면 초기화, 상시 대시보드 아님) — §13

---

## 7. 강점과 한계

### 강점

1. **백엔드 중심 서술** — UI/벤더 자랑보다 파이프라인·엔진·컨트롤 플레인
2. **검증 철학** — 클론 후 키 없이 `pnpm validate`
3. **경계의 정직함** — Partial을 Completed로 포장하지 않음
4. **통합 데모** — 한 프로세스에서 3 plane HTTP

### 한계 / 비목표 (의도적)

1. 제품형 프론트엔드 없음  
2. 문서 업로드/커넥터 운영 HTTP 제품화 미완 (law.go.kr는 1회성 스냅샷 스크립트이지 상시 커넥터 아님)  
3. LLMOps 스토어는 호스트 프로세스 생존 기간만 영속(InMemory) — SQL/디스크 영속화·공식 OTLP SDK는 미채택 (실 임베딩은 2026-07-30부로 선택 경로 채택 — §11)  
4. P3/P4 모두 charter 5/5 Completed 완료 (P3 2026-07-31 — §12, P4 2026-07-31 — §13); 남은 비목표는 공식 SDK/Express/OIDC/OTLP 등 영구 프리즈 항목뿐  

---

## 8. 면접용 압축 스크립트

**Why:** 기업 지식을 서빙하고, 복잡한 일을 워크플로로 돌리며, 그걸 버전·게이트·
관측으로 운영할 백엔드가 필요했다.

**What:** TypeScript Clean Architecture 플랫폼 — P2 serving, P3 workflow, P4
control plane — 동일 `pnpm start` 호스트.

**How:** Ports/adapters + Fake validators; researcher→P2; synth/critic→HTTP LLM;
control plane에 cited-answer latency 주입 헬퍼.

**Honest limit:** P2/P3/P4 charter capabilities are Completed, but Fake
embedding stays the default and InMemory (process-lifetime, non-durable)
ops stay the default — Postgres/OpenSearch/live OTLP are optional paths,
not requirements.

---

## 9. 산출물 목록

| 산출물 | 위치 |
|---|---|
| 본 시스템 보고 | `docs/PROJECT_SYSTEM_REPORT.md` |
| README (P2–P4 요약) | `README.md` |
| Why/What/How 내러티브 | `docs/PORTFOLIO_NARRATIVE.md` |
| 아키텍처 | `docs/architecture.md` |
| P2/P3/P4 매뉴얼 | `docs/P2_*.md`, `P3_*.md`, `P4_*.md` |
| 코드 증거 | `app/knowledge/{workflow,llmops,composition,api}` |
| 원격 | https://github.com/ShinSungRok/ai-knowledge-platform |

---

## 10. 권고 (다음이 있다면)

큰 틀을 건드리지 않는 선에서만:

1. 포트폴리오 **스크린샷/터미널 캡처**를 README에 보강  
2. ~~실 임베딩~~ (2026-07-30 완료 — §11); 문서 import API(상시 커넥터)는
   여전히 **별도 인간 승인 스코프**  
3. ~~Partial→Completed 승격은 새 헌장 없이 하지 말 것~~ (P3/P4 모두
   2026-07-31에 새 헌장 없이, Project 2 선례를 따라 5/5 Completed로
   승격 완료 — §12/§13). 남은 Partial은 인프라 어댑터(Postgres/
   OpenSearch/공식 OTLP SDK)뿐이며 이는 의도적으로 영구 보류 항목

---

## 11. 2026-07-30 업데이트 — P2 리트리벌 품질 개선

**배경:** Fake 임베딩/벡터 유사도만으로는 (a) 완전히 무관한 질의도 항상
그럴듯한 근거를 찾아 답변해버리는 문제, (b) 여러 후보가 topically 유사할
때 진짜 정답 조문을 안정적으로 1위로 못 올리는 문제가 있었음이 라이브
검증(실 OpenAI 키)으로 확인됨.

**변경 사항 (기존 "Complete" 클래스는 무수정, 신규 데코레이터만 composition
root에서 추가 배선):**

1. **실 데이터 추가** — `LawGoKrKnowledgeSourceConnector`가 law.go.kr
   (`OC=test`, 무등록) 조문을 파싱; `pnpm demo:seed:law-snapshot`으로 1회
   fetch해 커밋된 스냅샷(개인정보보호법/근로기준법/정보통신망법 총 416개
   조문)으로 저장. `pnpm start`는 이 스냅샷만 읽고 런타임에 law.go.kr을
   호출하지 않음. 기존 MFA/VPN 데모 문서에 **추가(additive)**.
2. **실 임베딩(선택)** — `HttpEmbeddingProvider`(OpenAI 호환, Ollama 호환)를
   `EMBEDDING_API_KEY`로 활성화, 1536차원(`text-embedding-3-large` 기본).
   기본값은 여전히 Fake.
3. **임계값 필터** — `ThresholdFilteringVectorRetriever`(코사인 유사도 ≥
   0.35), `ThresholdFilteringKeywordSearch`(커버리지 ≥ 0.3) — 무관 후보를
   조기에 제거.
4. **정규화 재랭킹** — `NormalizedReranker`가 RRF 점수(최대 ~0.033)와
   키워드 점수(0~1) 스케일 불일치를 보정.
5. **LLM 판정 재랭킹** — `LlmRerankedSearch`가 생존 후보 전체 + query를
   기존 `LanguageModelProvider`(신규 외부 의존성 없음) 한 번의 프롬프트로
   보내 0~10점 관련도를 매기고 재정렬; 임계값(0.4) 미만은 모두 제거.
6. **루트 코즈 버그 수정** — 시딩 함수가 composition에 설정된 실 임베딩과
   무관하게 문서를 `FakeEmbeddingProvider`로 하드코딩 임베딩하고 있어,
   query는 실 임베딩·문서는 Fake 임베딩으로 서로 다른 벡터 공간을 비교하던
   버그를 발견해 수정.

**검증:** `pnpm validate`(exit code 명시적으로 확인 — 파이프 종료코드
착시 주의) + 라이브 curl로 재현: 완전 무관 질의·다의어 오답·어휘 중복
오답 전부 차단 확인, 여러 재작성 질의에서도 정답 조문이 실제 본문과
대조해 매번 1위임을 확인.

**커밋:** `6fceed1`, `origin/main` 푸시 완료.

---

## 12. 2026-07-31 업데이트 — P3 Multi-Agent 5/5 Completed (CLOSED)

**배경:** 2026-07-30 같은 세션 후속 작업에서 P3 5개 캐퍼빌리티 중 2개
(Multi-Agent Evaluation, Shared Workflow Memory)를 실질 기능 보강으로
Completed 승격. 사용자가 "아직 남은 3개까지 하자"고 요청, 나머지 3개도
동일 원칙(기존 Complete 클래스 무수정, 타입 시스템에 이미 선언됐지만 한
번도 도달하지 못하던 죽은 상태를 실제로 살림)으로 마저 승격.

**변경 사항 (전부 옵셔널 필드 추가 방식 — 기존 export 타입 signature
breaking 없음):**

1. **Multi-Agent Role Contract → Completed** — `WorkflowAgentController`가
   `GET /workspaces/:id/workflow-agents`를 추가해 이미 동작하던
   `WorkflowAgentRegistry`를 읽기 전용으로 HTTP 노출. 레지스트리는
   워크스페이스 스코프가 아니라 프로세스 전역이라는 사실을 그대로 문서화
   (가짜로 스코프하지 않음).
2. **Workflow Orchestrator → Completed** — `WorkflowStepStatus`의
   `"skipped"`와 `WorkflowRunStatus`의 `"partial"`은 이전부터 타입에
   선언돼 있었지만 한 번도 실제로 만들어진 적이 없었음. `WorkflowGoal.
   metadata["workflow.skipRoles"]`로 특정 역할 스텝을 실패 없이 건너뛸 수
   있게 했고, invoke 실패에 한해(구조적 실패 제외) `MAX_STEP_INVOKE_
   ATTEMPTS=2`로 1회 재시도. 스킵된 스텝 다음 handoff는 "마지막 완료된"
   스텝 기준으로 정확히 이어짐(`lastCompleted` 추적).
3. **Agent Handoff/Delegation → Completed** — `WorkflowAgentInvokeResult.
   delegateToAgentId`(옵셔널)로 에이전트 자신의 출력이 다음 스텝을 같은
   역할의 다른 등록 에이전트로 지정할 수 있게 함 — 기존엔 항상 planner의
   고정 첫 번째 픽만 실행됐음. 미등록/역할 불일치 대상은 조용히 계획된
   에이전트로 폴백.

**검증:** `pnpm validate` 전체 체인(신규 `validate:api:workflow-agents`
포함) exit code 명시적으로 0 확인 + `pnpm typecheck` clean. 실제
`pnpm start` 기동 후 curl로 GET workflow-agents(200/401), POST→GET
run→GET memory 라운드트립, 알 수 없는 run id(404), 잘못된 workspace(403)
전부 실측 확인.

**프로젝트 라벨 변경:** 5/5 Completed에 따라 **Project 3: CLOSED (Partial)
→ CLOSED**로 승격 — Project 2가 일부 infra adapter는 Partial로 남아있지만
프로젝트 자체는 CLOSED로 라벨된 선례를 그대로 따름 (SDK/Express/OIDC 등은
frozen 비목표이지 캐퍼빌리티 갭이 아님).

**커밋:** 아직 미완료 — 사용자 요청 시 진행 예정.

---

## 13. 2026-07-31 업데이트 — P4 LLMOps 5/5 Completed (CLOSED)

**배경:** P3를 5/5 Completed로 마무리한 직후, 사용자가 "이제 p4 가자"고 요청.
동일 원칙(기존 InMemory adapter는 이미 완성·검증돼 있었지만, 유일한 실행
경로인 `RunLlmopsControlPlaneUseCase.execute()`가 매 호출마다 스토어를
새로 만들고 버려서(주석: "Each execute() runs a fresh InMemory control-plane
story") 실제 이력이 전혀 축적되지 않았고, HTTP 읽기 라우트가 5개 캐퍼빌리티
전부 0개였으며, `EvaluationGateDefinition` 타입은 코드베이스 어디서도
생성된 적 없는 완전한 죽은 타입이었음)으로 5개 캐퍼빌리티 전부 승격.

**변경 사항 (전부 옵셔널 필드/신규 포트 추가 방식 — 기존 export 타입
signature breaking 없음):**

1. **영속화 (5개 캐퍼빌리티 공통)** — `RunLlmopsControlPlaneUseCase` 생성자가
   `prompts`/`models`/`runs`/`serving`/`observations`/`gateDefinitions` 스토어를
   옵셔널 2번째 인자로 주입받도록 리팩터링, `createHostLlmopsControlPlane`이
   6개 스토어를 한 번만 만들어 호스트 프로세스 생존 기간 내내 재사용하는
   번들(`HostLlmopsControlPlane`)을 반환. 요청마다 재사용되던 8자 축약
   UUID(`randomUUID().slice(0,8)`)는 스토어가 영속화되면 누적 충돌 확률이
   현실적으로 위험해져 전체 UUID로 변경.
2. **Experiment/Run Tracking → Completed** — gate/regression 결과에 따라
   실제 `"failed"` 상태(+`error` 메시지)를 기록하도록 활성화(이전엔 항상
   `"completed"`). `GET /workspaces/:id/llmops/experiment-runs/:runId` 추가.
3. **Prompt & Model Registry → Completed** — `description` 필드를 실제로
   채워 넣도록 활성화(이전엔 항상 `undefined`). `GET .../llmops/prompts`,
   `GET .../llmops/models` 추가.
4. **Evaluation Gates/Regression Harness → Completed** — 신규
   `EvaluationGateDefinitionStore`/`InMemoryEvaluationGateDefinitionStore`로
   완전히 죽어있던 `EvaluationGateDefinition` 타입을 실제 스토어로 활성화;
   워크스페이스당 기본 정의를 최초 1회만 등록하고 이후 재사용(idempotent);
   요청 바디로 커스텀 `gateRules`를 넘기면 `"eq"`/`"lte"` 비교자까지 실측
   경로에서 도달 가능. `GET .../llmops/evaluation-gates` 추가.
5. **Deployment/Serving Configuration → Completed** — `environment`/
   `trafficPercent`를 요청 바디에서 받도록 활성화(이전엔 항상
   `"dev"`/`100` 하드코딩). `GET .../llmops/serving-configs` 추가.
6. **LLMOps Observability → Completed** — 이미 계산돼 있었지만 버려지던
   `meanReciprocalRank`를 quality map에 포함. `GET .../llmops/observations`
   추가. Live OTLP export는 로드맵 문서에 명시된 대로 그대로 비목표 유지.

**검증:** `pnpm validate` 전체 체인(신규 `validate:llmops:gate-definition-store`
포함) exit code 명시적으로 0 확인 + `pnpm typecheck` clean. 실제 `pnpm start`
기동 후 curl로 3연속 POST 실행 → prompts/models/serving-configs/observations가
각각 정확히 3개씩 누적됨을 확인(영속화 실증), evaluation-gates는 3번 POST 후에도
`gate-def-default` 1개만 존재함을 확인(idempotent 재사용 실증), 실패 메트릭
POST 시 GET experiment-runs가 `status:"failed"` + `error` 메시지를 정확히
반영함을 확인, 401/403 케이스 확인.

**프로젝트 라벨 변경:** 5/5 Completed에 따라 **Project 4: CLOSED (Partial)
→ CLOSED**로 승격 — Project 2/3과 동일한 선례.

**커밋:** 아직 미완료 — 사용자 요청 시 진행 예정.

**보고 종료.**
