# PROJECT02_INSTRUCTIONS.md

> AI Knowledge Platform — Project 2 Core Charter  
> Version: 1.0  
> Status: Closed (historical) — Project 2: CLOSED (Sprint 37). New work uses `PROJECT03_INSTRUCTIONS.md`.  
> Applies To: Historical reference for Project 2 charter; do not reopen CLOSED tracks  
> Last Updated: 2026-07-22 (status line only; body remains Project 2 historical charter)

---

## 1. 문서 목적과 우선순위

이 문서는 Project 2에서 **항상 적용하는 핵심 개발 헌장**이다.

모든 Agent는 작업 전에 이 문서를 적용한다.

Agent 역할, Skill 선택, 운영 규칙이 필요한 경우에만
`docs/agent/AGENT_OPERATIONS_GUIDE.md`를 참조한다.

```text
사용자의 현재 Task
        ↓
docs/agent/PROJECT02_INSTRUCTIONS.md
        ↓
승인된 구현 계획
        ↓
docs/agent/AGENT_OPERATIONS_GUIDE.md
        ↓
개별 Skill 기본 동작
```

현재 Task가 이 문서의 아키텍처·안전·검증 원칙과 충돌하면 즉시 구현하지 말고 충돌 이유와 대안을 보고한다.

---

## 2. 프로젝트 정체성

```text
Project 1  Public Law AI — Grounded RAG (완료)
    ↓
Project 2  AI Knowledge Platform — Knowledge + MCP + Agent (현재)
    ↓
Project 3  Enterprise AI Workflow — Multi-Agent
    ↓
Project 4  Enterprise LLMOps Platform
```

Project 2는 단순한 AI Chatbot이나 Demo가 아니다. Project 1의 검증된 구조를 재사용하여 Production 수준의 AI Knowledge Platform으로 확장한다.

증명할 역량:

- Backend Engineering
- AI Engineering
- Search Engineering
- Data Engineering
- Platform Engineering
- Agent Engineering
- DevOps 및 LLMOps 기반 역량

---

## 3. 핵심 범위

```text
Workspace
Knowledge Source
Connector
Document
Chunk
Embedding
Vector Index
Retriever
Hybrid Search
Re-ranking
Prompt
LLM
Grounding
Citation
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

현재 Task와 무관한 기능을 미리 구현하지 않는다. 미래 확장은 고려하되 YAGNI를 지킨다.

---

## 4. 최상위 원칙

```text
Architecture First
Reuse First
Search / Knowledge First
Validation First
Production First
```

반드시 지킨다.

1. 기존 구현과 추상화를 먼저 검토한다.
2. 교체보다 확장을 우선한다.
3. 관련 없는 리팩토링을 하지 않는다.
4. 중복 구현을 하지 않는다.
5. 불필요한 Framework와 Dependency를 추가하지 않는다.
6. Task 범위를 임의로 확장하지 않는다.
7. 검증하지 않은 성공을 주장하지 않는다.
8. Commit 후 추가 구현을 하지 않는다.

---

## 5. 아키텍처 원칙

Project 1의 다음 구조를 기본 자산으로 취급한다.

- Clean Architecture
- Composition Root
- Dependency Injection
- Provider Pattern
- Repository Pattern
- Prompt Builder 분리
- Validation Runner
- Runtime Validation
- Evaluation 및 Regression 체계

완료된 구조를 이유 없이 재설계하거나 다시 작성하지 않는다.

### 책임과 의존성

- Domain: 비즈니스 모델과 규칙
- Application: Use Case와 Workflow
- Infrastructure: PostgreSQL, OpenSearch, LLM, MCP, 외부 Connector 구현
- Presentation: HTTP, Streaming, Controller, Request/Response
- Composition Root: 객체 생성과 연결

Domain과 Application은 Infrastructure 세부 구현을 알지 않아야 한다. Concrete Dependency는 Composition Root에서 주입한다. 전역 객체나 Service Locator를 만들지 않는다.

### Provider와 Prompt

외부 시스템은 Provider 또는 Adapter를 통해 접근한다. Provider에는 비즈니스 로직을 넣지 않는다.

Prompt는 Prompt Builder에서 생성한다. LLM Provider 내부에서 Prompt를 생성하지 않는다.

### 데이터와 검색

```text
PostgreSQL = Source of Truth
OpenSearch = Rebuildable Search Index
```

Business Data를 OpenSearch에만 저장하지 않는다. Index는 PostgreSQL과 Pipeline으로 재생성 가능해야 한다.

---

## 6. Engineering 원칙

### Backend

- Controller, Repository, Provider에 Business Logic을 넣지 않는다.
- Class와 Module은 명확한 단일 책임을 가진다.
- 숨겨진 의존성을 만들지 않는다.
- 기존 Naming, Error Handling, Configuration, Logging 패턴을 따른다.
- 환경별 값은 검증 가능한 Configuration으로 분리한다.

### Search와 RAG

```text
Knowledge Source
→ Document
→ Chunk
→ Embedding
→ PostgreSQL
→ OpenSearch
→ Retriever
→ Hybrid Search
→ Re-ranking
→ Prompt Builder
→ LLM
→ Grounded Answer
→ Citation
→ Evaluation
```

Search 품질을 Prompt 튜닝보다 우선한다. Keyword, Vector, Hybrid Search는 데이터 특성과 평가 결과에 따라 선택한다.

Grounding 없는 답변을 정상 결과로 취급하지 않는다. 근거가 부족하면 부족함을 명시한다. 존재하지 않는 Citation을 생성하지 않는다.

### Workspace와 Connector

- Workspace는 Knowledge의 논리적 격리 단위다.
- Workspace 간 데이터와 권한을 암묵적으로 공유하지 않는다.
- Connector는 외부 시스템 접근과 변환 경계를 담당한다.
- Connector에 핵심 Business Logic을 넣지 않는다.
- Sync와 Import는 재시도와 중복 실행을 고려해 가능한 한 Idempotent하게 설계한다.
- 원본, 정규화 데이터, Chunk, Embedding, Index의 관계를 추적 가능하게 유지한다.

### MCP, Tool, Agent, Memory

- MCP는 Tool 연결과 Capability 노출을 위한 경계다.
- MCP를 Domain Business Logic 자체로 사용하지 않는다.
- Tool Input을 검증하고 권한과 신뢰 경계를 명확히 한다.
- Tool 실패, Timeout, Retry, 부분 실패를 명시적으로 처리한다.
- Agent 역할은 Planner, Executor, Reviewer 등으로 분리한다.
- Memory는 Knowledge와 다르며 검색을 대체하지 않는다.
- 장시간 Import, Sync, Embedding, Reindex, Evaluation은 Background Job으로 분리한다.

---

## 7. 표준 작업 흐름

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

### Review
관련 Module, Interface, Use Case, Repository, Provider, Test, Validation Runner를 먼저 확인한다.

### Reuse
기존 구현 → 기존 Interface → 기존 Pattern → 새 구현 순으로 검토한다.

### Design
변경 범위, 영향 범위, 재사용 대상, Validation 방법, 완료 조건을 구현 전에 정한다.

### Implement
승인된 범위만 최소 Production 코드로 구현한다.

### Validate
Task와 관련된 Build, Test, Validation Runner, Integration, Runtime, Regression을 실제로 실행한다. 모든 Task에 모든 검증을 기계적으로 강제하지 않는다. 생략한 검증과 이유를 명시한다.

### Diff Review
불필요한 변경, Debug 코드, 중복, Task 범위 밖 수정, Secret, 문서 불일치를 확인한다.

### Commit / Stop
검증 성공 후에만 Commit한다. Commit 후 즉시 멈추고 다음 Task를 기다린다.

---

## 8. Agent 역할

### Planning Agent

- 관련 코드를 읽는다.
- Project 1 재사용 지점을 찾는다.
- 아키텍처 영향과 위험을 분석한다.
- 구현 범위와 완료 조건을 작성한다.
- Developer Agent가 실행할 구체적인 Prompt를 작성한다.
- 명시적으로 요청받지 않으면 코드를 수정하지 않는다.

### Developer Agent

- 관련 코드를 다시 확인한다.
- 승인된 범위만 구현한다.
- 기존 추상화와 패턴을 재사용한다.
- 관련 검증을 실행한다.
- 최종 Diff를 검토한다.
- 검증 성공 시 Commit하고 멈춘다.

동일한 파일을 여러 Agent가 동시에 수정하지 않는다.

---

## 9. 완료 기준

다음 조건을 모두 충족해야 완료다.

- 요구사항 충족
- 기존 아키텍처와 의존성 방향 유지
- 기존 구현 우선 재사용
- Task 범위 밖 변경 없음
- 관련 Validation 실제 실행
- 실패·미확인 항목 공개
- 최종 Diff 검토
- 필요한 문서 동기화
- `docs/progress/PROJECT02_PROGRESS.md`에 Task 완료 기록 추가
- Commit 완료
- Commit 이후 추가 구현 없음

### Task Progress Log

모든 Task는 구현과 관련 Validation이 성공한 후,
`docs/progress/PROJECT02_PROGRESS.md`에 완료 기록을 추가한다.

Progress Log는 장문의 개발 일지나 회고 문서가 아니다.

Task마다 다음 정보만 간결하게 기록한다.

- Task 번호
- 완료 날짜
- Task 제목
- Commit Hash
- 핵심 변경 사항 3~5개
- 실행한 주요 Validation
- Status

Task 번호는 기존 Progress Log의 마지막 번호를 확인한 뒤
순차적으로 추가한다.

기록 형식은 다음을 따른다.

```md
## Task N

**Date**
YYYY-MM-DD

**Commit**
Commit Hash 또는 Pending

**Title**
간결한 Task 제목

**Summary**
- 핵심 변경 사항 1
- 핵심 변경 사항 2
- 핵심 변경 사항 3

**Validation**
- 실행한 주요 명령
- 실행한 주요 명령

**Status**
Completed
```

---

## 10. 금지 사항

- 전체 아키텍처 재설계
- 관련 없는 완료 모듈 리팩토링
- 중복 Class, Service, Provider, Repository 생성
- Provider 내부 Prompt 생성
- OpenSearch를 유일한 Source of Truth로 사용
- 사용자 승인 없는 대규모 파일 이동 또는 API 파괴
- 근거 없는 Framework·Dependency 도입
- 검증하지 않은 완료 선언
- 실행하지 않은 명령을 실행했다고 보고
- Secret, Credential, 개인정보의 코드·로그·문서 노출
- Commit 후 자율적인 추가 구현

---

## 11. 최종 선언

```text
Project 1을 존중하라.

기존 구조를 먼저 읽어라.

재사용을 우선하라.

Platform 중심으로 사고하라.

검증으로 증명하라.

Progress Log를 남겨라.

Commit 후 멈춰라.
```
