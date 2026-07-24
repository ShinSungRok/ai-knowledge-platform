# AI Knowledge Platform Agent Operations Guide

> Project 4 — Cursor Agent Operations Guide  
> (Project 2 / Project 3 / Project 4 charters are Closed / historical)  
> 적용 대상: Cursor Planning Agent, Cursor Developer Agent  
> 최종 갱신일: 2026-07-23

---

## 1. 문서 목적

이 문서는 **AI Knowledge Platform** 개발에 사용하는 Cursor Agent Skills의 역할, 설치 위치, 호출 방법, 운영 규칙을 정의한다.

이 문서는 프로젝트의 최상위 개발 지시서가 아니며, **Skill 선택·설치·호출·문제 해결이 필요할 때만 참조하는 운영 매뉴얼**이다.

프로젝트 목적, 아키텍처 원칙, 개발 절차, Validation, Commit 규칙은 별도의
`PROJECT04_INSTRUCTIONS.md`를 따른다 (Status: **Closed (historical)** —
Enterprise LLMOps **CLOSED (Partial)**). Project 3 헌장
(`PROJECT03_INSTRUCTIONS.md`)과 Project 2 헌장
(`PROJECT02_INSTRUCTIONS.md`)은 Closed (historical)이며, Project 2: CLOSED /
Project 3: CLOSED (Partial) / Project 4: CLOSED (Partial) /
Partial≠Completed 서술을 되돌리지 않는다. **Do not invent Project 5 /
PROJECT05**. Do not reopen Partial tracks.

**Current implementation track status (human-authorized):**
**P4 Later — Thin Control Plane HTTP: Complete** (Sprint 71, Tasks 217–220).
Bearer-protected `POST /workspaces/:workspaceId/llmops/control-plane` on
`pnpm start` (InMemory story). Does **not** promote Project 4 Partial →
Completed. Does **not** invent Project 5. Express/Fastify forbidden. Live OTLP
/ official LLMOps SaaS SDKs remain deferred. Await further human charter for
additional work. P3 Later Thin Workflow HTTP and P2 Service Completion remain
**Complete**.

문서 간 우선순위는 다음과 같다.

```text
Closed human-authorized track (P4 Later Thin Control Plane HTTP Complete)
        ↓
Closed human-authorized tracks (P3 Later Thin Workflow HTTP Complete;
  P4 Phase 0 Complete; P3 Phase A+B Complete; P2 Service Completion Complete)
        ↓
Closed historical charters (PROJECT04 / PROJECT03 / PROJECT02) for constraints
        ↓
AGENT_OPERATIONS_GUIDE.md
        ↓
개별 Task Prompt
```

- `PROJECT04_INSTRUCTIONS.md`: Project 4 Enterprise LLMOps charter (Closed historical)
- `PROJECT03_INSTRUCTIONS.md`: Project 3 Multi-Agent charter (Closed historical)
- `PROJECT02_INSTRUCTIONS.md`: Project 2 historical charter (Closed — 참조만)
- `AGENT_OPERATIONS_GUIDE.md`: 어떤 Agent Skill을 언제 어떻게 사용할지 정의
- 개별 Task Prompt: 현재 작업의 구체적인 범위와 완료 조건 정의

P4 Later (Thin Control Plane HTTP) 작업은 `docs/progress/PROJECT04_PROGRESS.md`에
기록한다 (Task 217+). P3 Later는 `docs/progress/PROJECT03_PROGRESS.md`에
유지한다. Skill 결과가 Project 2/3/4 CLOSED 서술과 충돌하면 CLOSED /
CLOSED (Partial)를 보존한다.

---

## 2. 프로젝트 개발 환경

```text
Windows 11
    ↓
Cursor
    ↓
WSL2 Ubuntu
    ↓
/home/user/workspace/vibe/ai-knowledge-platform
```

Cursor에서 프로젝트를 열 때는 Windows 파일 경로가 아니라 WSL Remote 환경의 프로젝트 루트를 사용한다.

권장 작업 폴더:

```text
/home/user/workspace/vibe/ai-knowledge-platform
```

---

## 3. Agent 역할 분담

### 3.1 Planning Agent

권장 모델: `o3-mini`

역할:

- 저장소와 기존 구현 분석
- Project 1 재사용 지점 식별
- 아키텍처 영향 검토
- 구현 범위 정의
- Task 분해
- Developer Agent용 작업 지시 작성
- 구현 결과 및 Diff 검토
- 다음 Task 결정

Planning Agent는 명시적인 구현 요청이 없는 한 직접 코드를 수정하지 않는다.

기본 지시:

```text
현재 저장소를 먼저 분석하라.
기존 아키텍처와 재사용 가능한 추상화를 확인하라.
아직 코드를 수정하지 마라.
구현 범위, 변경 예상 파일, Validation 방법, 완료 조건을 정리하라.
Developer Agent에게 전달할 실행 지시를 작성한 뒤 멈춰라.
```

---

### 3.2 Developer Agent

권장 모델: `Claude Sonnet`

역할:

- 승인된 Task 구현
- 기존 코드와 추상화 재사용
- 테스트 및 Validation 수행
- 최종 Diff 검토
- Commit
- 작업 종료

기본 지시:

```text
관련 구현을 먼저 검토하라.
승인된 Task 범위만 구현하라.
기존 추상화와 패턴을 최대한 재사용하라.
관련 Validation을 모두 실행하라.
최종 Diff를 검토하라.
검증이 성공한 경우에만 Commit하라.
Commit 후 추가 구현을 하지 말고 즉시 멈춰라.
```

---

## 4. 설치 Skill 한눈에 보기

| 이름 | 역할 | 적용 방식 | 권장 사용 주체 |
|---|---|---|---|
| `caveman` | 답변 축약, 출력 토큰 절감 | 필요 시 호출 | Planning / Developer |
| `ponytail` | 최소 구현, YAGNI, 과잉 설계 억제 | 상시 규칙 + 필요 시 호출 | Developer |
| `superpowers` | Brainstorming, 계획, TDD, 검증 워크플로 | 단계별 호출 | Planning / Developer |
| `gstack` | 제품 검토, 설계 리뷰, 코드 리뷰, QA, 보안, 배포 | 필요 시 역할형 호출 | Planning / Reviewer |

Skill의 역할은 다음처럼 구분한다.

```text
프로젝트 규칙    → PROJECT04_INSTRUCTIONS.md (Closed historical; PROJECT03/PROJECT02 = Closed)
개발 프로세스    → superpowers / gstack
코드 양과 복잡도 → ponytail
응답 길이        → caveman
```

여러 Skill을 동시에 사용할 수 있지만, 서로 다른 책임을 맡겨야 한다.

---

# 5. caveman

## 5.1 역할

`caveman`은 Agent의 설명을 짧게 유지하면서 기술적 핵심과 명령어는 보존한다.

적합한 상황:

- Agent 답변이 지나치게 길 때
- Task 결과 요약만 필요할 때
- Commit 메시지나 리뷰 의견을 짧게 받고 싶을 때
- 출력 토큰을 절약하고 싶을 때

적합하지 않은 상황:

- 새로운 아키텍처를 상세히 검토할 때
- 장애 원인을 깊게 분석할 때
- 구현 계획의 누락을 점검할 때

---

## 5.2 주요 Skill

| Skill | 용도 |
|---|---|
| `caveman` | 기본 축약 응답 |
| `caveman-commit` | 짧은 Conventional Commit 제안 |
| `caveman-review` | 핵심 리뷰 의견만 출력 |
| `caveman-compress` | 긴 Agent 메모나 지시 파일 압축 |
| `caveman-stats` | 토큰 절감 추정 |
| `caveman-help` | 도움말 |
| `cavecrew` | 조사·구현·리뷰 역할 분리 |

---

## 5.3 사용 예시

### 짧은 설명

```text
caveman mode로 답해.
현재 Diff에서 변경된 핵심만 세 문장으로 정리해.
```

### Commit 메시지

```text
caveman-commit 스킬을 사용해.
현재 git status와 git diff를 기준으로
Conventional Commit 메시지 하나만 제안해.
제목은 50자 이내로 작성해.
```

### 정상 모드 복귀

```text
normal mode.
이제 필요한 만큼 자세히 설명해.
```

---

## 5.4 운영 권장

Planning 단계에서는 기본적으로 사용하지 않는다.

Developer Agent가 작업을 완료한 뒤 아래와 같이 결과를 축약할 때 사용한다.

```text
caveman full.
변경 파일, Validation 결과, Commit 해시, 남은 위험만 정리해.
```

---

# 6. ponytail

## 6.1 역할

`ponytail`은 Agent가 필요 이상으로 많은 코드, 추상화, 파일, 의존성을 추가하지 않도록 통제한다.

Project 2의 핵심 원칙인 `Reuse First`, `YAGNI`, `Minimal Production Code`와 가장 밀접한 Skill이다.

항상 다음 순서로 판단한다.

1. 이 구현이 정말 필요한가?
2. 기존 코드로 해결할 수 있는가?
3. 표준 라이브러리로 해결할 수 있는가?
4. 플랫폼 네이티브 기능으로 해결할 수 있는가?
5. 이미 설치된 의존성으로 해결할 수 있는가?
6. 더 적은 파일과 코드로 해결할 수 있는가?
7. 그다음에만 새로운 코드를 작성한다.

보안, 접근성, 데이터 검증, 신뢰 경계는 최소화 대상이 아니다.

---

## 6.2 Project 2 적용 원칙

`ponytail`은 다음을 방지하는 용도로 사용한다.

- Project 1에 이미 존재하는 기능의 재구현
- 불필요한 Base Class와 Wrapper
- 사용되지 않는 확장 포인트
- 추측 기반 인터페이스 설계
- 새 라이브러리의 무분별한 도입
- 단순 기능을 위한 과도한 파일 분리
- Task 범위를 벗어난 리팩토링

---

## 6.3 사용 예시

### 최소 구현 요청

```text
ponytail 원칙을 적용해.
기존 추상화를 먼저 탐색하고,
새로운 파일과 Dependency를 최소화해서 구현해.
```

### Diff 과잉 구현 검토

```text
ponytail-review 스킬을 사용해.
현재 Diff만 검토하라.
과한 추상화, 불필요한 파일, 중복 구현을 심각도 순으로 나열하라.
아직 수정하지 마라.
```

### 기술 부채 점검

```text
ponytail-debt 스킬을 사용해.
현재 Task에서 새로 만든 기술 부채만 식별하라.
기존 프로젝트 전체의 일반적인 개선사항은 제외하라.
```

---

## 6.4 강도

| 모드 | 사용 시점 |
|---|---|
| `lite` | 기존 코드가 복잡해 최소화 판단이 신중해야 할 때 |
| `full` | 일반적인 Project 2 구현 |
| `ultra` | Agent가 과잉 추상화나 파일 생성을 반복할 때 |
| `off` | 사용자가 의도적으로 확장형 설계를 요구한 제한적 상황 |

권장 기본값:

```text
ponytail full
```

---

# 7. superpowers

## 7.1 역할

`superpowers`는 코딩 전에 요구사항과 설계를 확인하고, 구현 계획과 검증 절차를 명시하도록 강제한다.

Project 2에서는 아래 개발 순서를 지원한다.

```text
Review
  ↓
Brainstorm
  ↓
Plan
  ↓
Approval
  ↓
Implement
  ↓
Validate
  ↓
Review
  ↓
Commit
  ↓
Stop
```

---

## 7.2 주요 Skill

| Skill | 역할 |
|---|---|
| `using-superpowers` | 현재 사용할 수 있는 Skill 탐색 및 우선 사용 |
| `brainstorming` | 요구사항과 설계 합의 |
| `writing-plans` | 구현 계획 작성 |
| `executing-plans` | 승인된 계획 실행 |
| `subagent-driven-development` | Task별 Sub-agent 분담 |
| `test-driven-development` | RED → GREEN → REFACTOR |
| `systematic-debugging` | 원인 우선 디버깅 |
| `verification-before-completion` | 완료 전 증거 검증 |
| `using-git-worktrees` | 격리된 작업 환경 구성 |
| `finishing-a-development-branch` | Branch 종료 방식 결정 |
| `requesting-code-review` | 코드 리뷰 요청 |
| `receiving-code-review` | 리뷰 반영 |
| `dispatching-parallel-agents` | 독립 작업 병렬화 |
| `writing-skills` | 프로젝트 전용 Skill 작성 |

---

## 7.3 Planning Agent 권장 흐름

### 1단계: 기존 구조 분석

```text
using-superpowers 기준으로 작업하라.
먼저 현재 저장소와 관련 모듈을 분석하라.
Project 1에서 재사용 가능한 구조를 확인하라.
아직 코드를 수정하지 마라.
```

### 2단계: 설계 검토

```text
brainstorming 스킬을 사용해.
[기능 또는 목표]를 기존 아키텍처에 최소 변경으로 추가하는 방법을 검토하라.
확인되지 않은 부분은 질문으로 분리하라.
아직 코드를 작성하지 마라.
```

### 3단계: 구현 계획

```text
writing-plans 스킬을 사용해.
승인된 설계를 기준으로 구현 계획만 작성하라.
변경 예상 파일, 재사용할 기존 추상화, Validation 명령,
완료 조건을 포함하라.
아직 구현하지 마라.
```

---

## 7.4 Developer Agent 권장 흐름

```text
계획은 승인되었다.
executing-plans 또는 test-driven-development 방식으로 구현하라.

규칙:
- 기존 추상화 우선
- Task 범위 확장 금지
- 관련 없는 리팩토링 금지
- Validation 필수
- Diff Review 필수
- Commit 후 Stop
```

---

## 7.5 버그 수정

```text
systematic-debugging 스킬을 사용해.
증상: [증상]

추측으로 패치하지 마라.
재현 조건, 실제 원인, 영향 범위를 먼저 조사하라.
원인이 확인되기 전에는 코드를 수정하지 마라.
```

원인 승인 후:

```text
확인된 원인만 최소 수정하라.
verification-before-completion으로 재현 시나리오와
관련 Validation 결과를 확인한 뒤 완료를 보고하라.
```

---

## 7.6 완료 검증

```text
verification-before-completion 스킬을 사용해.
완료를 주장한 모든 항목을 실제 명령 결과로 증명하라.

반드시 포함:
- 실행한 Validation 명령
- 성공/실패 결과
- 확인하지 못한 항목
- 최종 git diff 요약

증거가 없으면 완료라고 말하지 마라.
```

---

# 8. gstack

## 8.1 역할

`gstack`은 Agent를 가상의 제품·엔지니어링 조직처럼 활용한다.

Project 2에서는 다음 목적에 사용한다.

- 제품 문제 정의
- 구현 계획의 경영·기술 검토
- 코드 리뷰
- 보안 점검
- 화면 및 Runtime QA
- PR 및 배포 준비
- 스프린트 회고

---

## 8.2 주요 Skill

| 목적 | Skill |
|---|---|
| 문제 정의 | `gstack-office-hours` |
| 자동 계획 | `gstack-autoplan` |
| 제품 관점 계획 리뷰 | `gstack-plan-ceo-review` |
| 엔지니어링 계획 리뷰 | `gstack-plan-eng-review` |
| 디자인 계획 리뷰 | `gstack-plan-design-review` |
| 코드 리뷰 | `gstack-review` |
| 보안 감사 | `gstack-cso` |
| 브라우저 QA | `gstack-qa`, `gstack-qa-only` |
| PR/배포 준비 | `gstack-ship` |
| Merge와 배포 | `gstack-land-and-deploy` |
| 웹 탐색 | `gstack-browse` |
| 회고 | `gstack-retro` |
| 업데이트 | `gstack-upgrade` |

---

## 8.3 Project 2 권장 사용법

### 기능 목적 검증

새 기능의 가치나 범위가 불명확할 때:

```text
gstack-office-hours 스킬을 사용해.
주제: [기능]

지금은 구현하지 마라.
실제 사용자, 해결하려는 문제, 빈도, 운영 비용,
성공 기준을 먼저 질문하라.
```

### 계획 엔지니어링 리뷰

```text
gstack-plan-eng-review 스킬을 사용해.
현재 구현 계획을 Project 1 아키텍처 재사용,
의존성 방향, 데이터 일관성, 운영 가능성,
Validation 관점에서 검토하라.
수정이 필요한 항목만 우선순위 순으로 제시하라.
```

### 코드 리뷰

```text
gstack-review 스킬을 사용해.
현재 변경분만 리뷰하라.

우선순위:
1. 기능 오류
2. 아키텍처 위반
3. 보안 문제
4. 데이터 일관성
5. 테스트 및 Validation 누락
6. 과잉 구현

칭찬보다 수정이 필요한 항목을 중심으로 작성하라.
```

### 보안 점검

```text
gstack-cso 스킬을 사용해.
이번 변경분을 기준으로 빠른 보안 감사를 수행하라.

검토:
- 인증과 권한
- 입력 검증
- Secret 노출
- 외부 Connector 신뢰 경계
- MCP Tool 권한
- SSRF / Injection
- 개인정보 및 민감정보
- 로그 노출

아직 코드는 수정하지 마라.
```

### 화면 QA

```text
gstack-qa 스킬을 사용해.
대상 URL: http://localhost:3000

확인:
- 첫 화면 로드
- 핵심 사용자 흐름
- Streaming 응답
- 오류 상태
- 브라우저 콘솔 오류
- Citation 및 Evidence 표시

결과와 재현 절차만 보고하라.
```

---

# 9. Skill 조합 규칙

## 9.1 일반 기능 개발

```text
1. superpowers: brainstorming
2. superpowers: writing-plans
3. 사용자 승인
4. ponytail: 최소 구현
5. superpowers: verification-before-completion
6. gstack-review
7. Commit
8. Stop
```

---

## 9.2 버그 수정

```text
1. systematic-debugging
2. 원인 승인
3. ponytail 최소 수정
4. verification-before-completion
5. gstack-review
6. Commit
7. Stop
```

---

## 9.3 아키텍처 영향이 큰 기능

```text
1. gstack-office-hours
2. brainstorming
3. writing-plans
4. gstack-plan-eng-review
5. 사용자 승인
6. Developer Agent 구현
7. verification-before-completion
8. gstack-review
9. Commit
10. Stop
```

---

## 9.4 단순 변경

문구, 작은 설정, 명백한 오타처럼 위험이 낮은 변경은 전체 절차를 과도하게 적용하지 않는다.

최소 절차:

```text
Review
→ ponytail 최소 변경
→ 관련 Validation
→ Diff Review
→ Commit
→ Stop
```

---

# 10. Project 2 전용 운영 규칙

## 10.1 Project 1 계승

모든 Agent는 다음 원칙을 따른다.

- Project 1의 구조를 먼저 분석한다.
- 기존 Layer, Interface, Provider, Repository, Validation Runner를 우선 재사용한다.
- 완료된 모듈을 이유 없이 다시 작성하지 않는다.
- 새 기능은 기존 Composition Root에 통합한다.
- Infrastructure 세부 구현을 Domain과 Application에 노출하지 않는다.
- Prompt 생성과 LLM Provider 호출을 분리한다.
- PostgreSQL을 Source of Truth로 유지한다.
- OpenSearch를 재생성 가능한 Search Index로 유지한다.

---

## 10.2 Project 2 핵심 영역

Skill이 계획이나 구현을 수행할 때 아래 플랫폼 영역을 고려한다.

```text
Workspace
Knowledge Source
Connector
Document
Chunk
Embedding
Vector Index
Retriever
MCP
Tool Calling
Agent
Memory
Background Job
Knowledge Sync
Evaluation
Runtime
Operations
```

단, 현재 Task와 무관한 영역까지 미리 구현하지 않는다.

---

## 10.3 금지 사항

Skill 사용 여부와 관계없이 다음 행위는 금지한다.

- 전체 아키텍처 재설계
- 관련 없는 리팩토링
- 중복 구현
- 검증되지 않은 새 Framework 도입
- Task 범위의 임의 확장
- Validation 없이 완료 선언
- 사용자 승인 없이 대규모 파일 이동
- OpenSearch를 유일한 Source of Truth로 사용
- Provider 내부에서 Prompt 생성
- Commit 이후 추가 구현

---

# 11. 설치 위치 권장 구조

```text
ai-knowledge-platform/
├── .agents/
│   └── skills/
│       ├── architecture-guard/
│       └── validate-skeleton/
│
├── .cursor/
│   └── rules/
│       ├── agent-workflow.mdc
│       ├── architecture.mdc
│       ├── development.mdc
│       └── validation.mdc
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── development.md
│   ├── modules.md
│   ├── portfolio.md
│   │
│   ├── agent/
│   │   ├── PROJECT04_INSTRUCTIONS.md  # Closed (historical)
│   │   ├── PROJECT03_INSTRUCTIONS.md  # Closed (historical)
│   │   ├── PROJECT02_INSTRUCTIONS.md  # Closed (historical)
│   │   └── AGENT_OPERATIONS_GUIDE.md
│   │
│   └── progress/
│       ├── PROJECT04_PROGRESS.md      # historical CLOSED Partial
│       ├── PROJECT04_ROADMAP_STATUS.md # Project 4: CLOSED (Partial)
│       ├── PROJECT03_PROGRESS.md      # historical CLOSED Partial
│       ├── PROJECT03_ROADMAP_STATUS.md
│       ├── PROJECT02_PROGRESS.md      # historical
│       └── PROJECT02_ROADMAP_STATUS.md # Project 2: CLOSED
│
└── app/
```

# 12. 설치 명령 예시

설치 전 각 저장소의 최신 설치 방법과 라이선스를 확인한다.

## caveman

```bash
npx skills add JuliusBrussee/caveman -a cursor
```

## ponytail

```bash
npx skills add DietrichGebert/ponytail -a cursor
```

## superpowers

```bash
npx skills add ssoyeon8914/superpowers -a cursor
```

## gstack

gstack은 배포 버전과 생성 방식이 달라질 수 있으므로 해당 저장소의 Cursor 설치 절차를 먼저 확인한다.

설치 후 프로젝트 로컬 Skill과 Cursor 전역 Skill의 중복 여부를 점검한다.

---

# 13. 설치 확인

Cursor에서 새 Agent Chat을 열고 아래 명령을 각각 실행한다.

## caveman

```text
caveman mode.
현재 작업 디렉터리를 한 문장으로 설명해.
```

## ponytail

```text
ponytail-help
```

## superpowers

```text
using-superpowers 기준으로
현재 사용할 수 있는 주요 Skill 이름 5개만 나열해.
```

## gstack

```text
gstack-office-hours 스킬을 사용할 수 있으면
"OK gstack"이라고만 답해.
```

기대한 반응이 없으면 다음을 확인한다.

1. Cursor를 재시작한다.
2. WSL Remote 환경으로 프로젝트를 다시 연다.
3. `.agents/skills`와 `.cursor/rules` 경로를 확인한다.
4. Skill 이름을 슬래시 명령 대신 자연어로 직접 호출한다.
5. 프로젝트 인덱싱이 완료되었는지 확인한다.

---

# 14. 문제 해결

| 증상 | 확인 방법 |
|---|---|
| `/` 자동완성에 Skill이 없음 | Skill 이름을 자연어로 직접 입력 |
| Agent가 바로 코딩함 | `코드 수정 금지`, `계획만 작성`을 명시 |
| Agent가 너무 장황함 | 같은 메시지 첫 줄에 `caveman full` 추가 |
| 과도한 파일과 추상화 생성 | `ponytail-review` 또는 `ponytail ultra` 사용 |
| 완료라고 하지만 증거가 없음 | `verification-before-completion` 실행 |
| 설계가 Project 1과 충돌 | `gstack-plan-eng-review`로 재검토 |
| Agent들이 같은 파일을 동시에 수정 | Planning Agent는 읽기 전용, Developer Agent만 수정 |
| WSL 명령이 동작하지 않음 | Cursor 하단 상태 표시줄에서 `WSL: Ubuntu` 확인 |
| gstack QA가 실패함 | 로컬 서버 URL과 실행 상태를 먼저 확인 |

---

# 15. 표준 프롬프트 템플릿

## 15.1 Planning Agent 시작 프롬프트

```text
docs/agent/PROJECT04_INSTRUCTIONS.md를 먼저 읽어라.

docs/agent/AGENT_OPERATIONS_GUIDE.md는
Agent 역할이나 Skill 선택이 필요한 경우에만 읽어라.

너는 이 저장소의 Planning Agent다.

직접 구현하지 마라.

현재 Task:

[Task 설명]

다음 순서로 진행하라.

1. 현재 Repository 분석
2. Project 1 재사용 후보 분석
3. 아키텍처 영향 분석
4. 구현 범위 정의
5. 변경 예상 파일 정리
6. Validation 계획 작성
7. Definition of Done 작성
8. Developer Agent용 실행 프롬프트 작성
9. Stop

필요한 경우에만 brainstorming,
writing-plans,
gstack-plan-eng-review Skill을 사용하라.
```

---

## 15.2 Developer Agent 시작 프롬프트

```text
docs/agent/PROJECT04_INSTRUCTIONS.md를 먼저 읽어라.

docs/agent/AGENT_OPERATIONS_GUIDE.md는
Agent 운영 규칙이나 Skill 사용이 필요한 경우에만 읽어라.

너는 이 저장소의 Developer Agent다.

승인된 Task:

[Planning Agent가 작성한 Task]

반드시 다음 순서를 따른다.

1. 관련 코드 Review
2. 기존 추상화 Reuse
3. 최소 Production 구현
4. 관련 테스트와 Validation 실행

Validation이 성공한 경우에만

5. docs/progress/PROJECT02_PROGRESS.md 업데이트
6. 최종 Diff Review
7. 검증 성공 시 Commit
8. Commit 후 즉시 Stop

ponytail 원칙을 유지하라.

검증 전에는 완료라고 하지 마라.

Task 범위를 확장하지 마라.

Progress Log 업데이트를 완료 기준에 포함하라.
```

---

## 15.3 구현 완료 검토 프롬프트

```text
verification-before-completion과
gstack-review를 사용해
방금 구현한 Task를 검토하라.

반드시 확인:

- 요구사항 충족
- Project 1 아키텍처 계승
- 중복 구현 여부
- 과잉 추상화 여부
- Validation 실행 증거
- Progress Log 업데이트 여부
- 최종 Diff
- Commit 상태

문제가 있으면 수정하지 말고 먼저 보고하라.

문제가 없으면 완료 근거를 짧게 정리하라.

Progress Log가 누락되었다면 완료로 처리하지 마라.
```
---

## 15.4 Progress Log Template

```md
## Task N

**Date**  
YYYY-MM-DD

**Commit**

Commit Hash 또는 Pending

**Title**  
...

**Summary**
- ...
- ...
- ...

**Validation**
- pnpm validate
- pnpm typecheck

**Status**  
Completed
```

### Progress Log 규칙

- Validation이 성공한 경우에만 Progress Log를 작성한다.
- 새로운 Task는 파일 마지막에 추가한다.
- 기존 Task 기록은 수정하거나 삭제하지 않는다.
- Task 번호는 마지막 기록을 확인한 뒤 순차적으로 추가한다.
- Summary는 핵심 변경 사항만 3~5개 작성한다.
- Progress Log 업데이트는 해당 Task의 완료 조건에 포함된다.

---

# 16. 최종 운영 원칙

항상 기억한다.

```text
Project Instructions가 Skill보다 우선한다.

Skill은 판단을 대신하지 않는다.

Planning Agent는 계획한다.

Developer Agent는 구현한다.

ponytail은 코드 양을 통제한다.

superpowers는 개발 절차를 통제한다.

gstack은 제품·설계·리뷰·QA 관점을 보완한다.

caveman은 출력 길이를 통제한다.

검증 없는 완료는 완료가 아니다.

Progress Log 없는 Task는 완료가 아니다.

Commit 후에는 반드시 멈춘다.
```
