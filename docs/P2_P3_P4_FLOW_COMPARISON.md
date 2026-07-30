# P2 vs P3 vs P4 — 차이와 플로우 로직

## 한눈에 보는 차이

| | 무엇을 하는가 | 핵심 질문 | 상태 |
|---|---|---|---|
| P2 지식 서빙 | 질문 하나에 근거 붙여 답변 | "이 답변, 어디서 나온 근거야?" | Complete |
| P3 멀티 에이전트 워크플로우 | 목표 하나를 여러 에이전트가 순차/위임 처리 | "누가 누구한테 뭘 넘겼어?" | Partial |
| P4 LLMOps 제어 평면 | 프롬프트/모델 실험을 게이트 통과시켜 서빙에 반영 | "이 변경, 배포해도 안전해?" | Partial |

관계: **P3는 P2를 도구로 쓰고, P4는 P2/P3의 실행 결과를 관측·평가한다.** 완전히 분리된 3개가 아니라 하위 레이어를 상위 레이어가 감싸는 구조다.

---

## P2 — 지식 서빙 플로우 (`/cited-answers`)

데모 데이터로 실제 흐름 추적:

| 순서 | 단계 | 입력 | 출력/동작 |
|---|---|---|---|
| 1 | 시딩 (기동 시 1회) | `seedDemoKnowledge()` + `seedLawKnowledgeFromSnapshot()` | MFA/VPN 데모 청크 + law.go.kr 실 조문 416개(개인정보보호법/근로기준법/정보통신망법, 커밋된 스냅샷 JSON에서 로드, additive) 저장; 둘 다 `composition.embeddingProvider`(기본 Fake, `EMBEDDING_API_KEY` 시 실 임베딩)로 임베딩해 VectorIndex에 upsert |
| 2 | 요청 수신 | `POST /cited-answers` body `{workspaceId:"workspace-a", query:"Is MFA required for VPN?"}` | Bearer 인증 → workspace 인가 통과 |
| 3 | Use case 진입 | `GenerateCitedGroundedAnswerUseCase.execute({workspaceId, query, retrievalLimit, maxCharacters})` | 내부적으로 `GenerateGroundedAnswerUseCase` 호출 |
| 4 | 후보 검색 | query 임베딩 vs VectorIndex + 키워드 인덱스 | keyword/vector 각각 임계값 필터(코사인 ≥0.35 / 커버리지 ≥0.3)로 무관 후보 제거 후 hybrid(RRF)로 융합 |
| 5 | 1차 재랭킹 | hybrid 융합 결과 | 정규화 재랭킹(RRF·키워드 점수 스케일 보정) 후 최소 관련도 미만 제거 |
| 6 | LLM 판정 재랭킹 | 생존 후보 전체 + query | 같은 `LanguageModelProvider`에 후보를 한 프롬프트로 보내 0~10점 관련도 채점 → 재정렬, 임계값 미만 전부 제거 → 여기서 다 걸러지면 `insufficientEvidence:true`로 조기 응답 |
| 7 | grounding context 구성 | 최종 생존 청크 | 프롬프트에 삽입될 근거 텍스트 확보 |
| 8 | LLM 호출 (최종 답변) | grounding context + query | Fake LLM(기본) 또는 `LLM_API_KEY` 설정 시 실제 LLM이 답변 생성 |
| 9 | citation 빌드 | 생성된 answer | `citationBuilder.build(answer)` → 어떤 청크에서 왔는지 매핑 |
| 10 | 응답 | — | `{answer, citations}` 반환 (근거 없으면 `insufficientEvidence` 플래그) |

**핵심:** 3~10단계 로직은 Fake든 Real이든 코드가 동일 — 바뀌는 건 어댑터뿐.
무관 질의는 4~6단계에서 걸러져 `insufficientEvidence`로 반환되고, 유사
후보가 여럿일 때는 6단계 LLM 판정이 정답 조문 하나를 1위로 고정한다
(벡터 유사도 단독으로는 이 정밀도를 못 낸다는 게 실측으로 확인된 한계).

---

## P3 — 멀티 에이전트 워크플로우 플로우 (`/workspaces/:id/workflow-runs`)

| 순서 | 단계 | 입력 | 출력/동작 |
|---|---|---|---|
| 1 | 요청 수신 | `POST /workspaces/workspace-a/workflow-runs` body `{objective:"..."}` | 인증/인가 → objective 유효성 검사 |
| 2 | 플래너 | objective | 결정론적(deterministic) planner가 단계(step) 목록 생성 — 예: researcher → synthesizer → critic |
| 3 | 오케스트레이터 실행 | plan | 단계를 순서대로 순회하며 각 에이전트 invoke |
| 4 | invoker 선택 | 에이전트 role | researcher는 **knowledge bridge**(=P2 use case를 내부 호출!), synth/critic은 LLM invoker, 실패 시 Fake fallback |
| 5 | handoff 빌드 | `previous` step 결과, `next` 에이전트 | `DefaultWorkflowHandoffBuilder`가 `previous.status==="completed"` 검증 → `payload = previous.output.trim()` |
| 6 | handoff 종류 판정 | previous.role vs next.role | coordinator→비coordinator면 `"delegation"`(reason: coordinator-delegation), 그 외엔 `"sequential"`(reason: sequential-pass) |
| 7 | 다음 단계 입력 전달 | handoff.payload | 이전 단계의 output이 다음 단계의 input이 됨 (체이닝) |
| 8 | 메모리 기록 | 각 단계 실행 결과 | append-only workflow memory에 순서대로 적재 (수정 불가, 추가만) |
| 9 | 응답 | 전체 실행 | `WorkflowRunResult` (단계별 결과 + 최종 산출물) |

**핵심:** researcher 에이전트가 근거를 찾을 때 P2의 cited-answer 로직을 그대로 재사용 — P3는 P2 위에 "여러 에이전트가 순서/위임 규칙을 지키며 협업"하는 레이어를 얹은 것.

---

## P4 — LLMOps 제어 평면 플로우 (`/llmops/control-plane`)

| 순서 | 단계 | 입력 | 출력/동작 |
|---|---|---|---|
| 1 | registry 등록 | 프롬프트 버전 / 모델 설정 | registry에 candidate로 저장 |
| 2 | experiment 실행 | registry entry | 실제 요청 실행 (예: `runLlmopsFromCitedAnswerDemo.ts`가 `/cited-answers`를 실제로 호출해 wall-clock 지연시간 측정 = "B-path") |
| 3 | 메트릭 산출 | 실행 결과 | `insufficientEvidence` 여부·citation 개수 등에서 soft quality 지표 도출 + 실측 latency |
| 4 | evaluation gate | 메트릭 vs 임계값 | 숫자 임계값(threshold) 통과 여부 판정 — 통과 못하면 여기서 막힘 |
| 5 | regression harness | baseline vs candidate 메트릭 비교 | 기존 대비 악화 여부 확인 |
| 6 | serving config 활성화 | gate 통과 + regression 통과 | candidate를 실제 서빙 설정으로 승격 |
| 7 | observation store 적재 | 활성화된 설정의 이후 실행들 | quality/cost/latency를 지속 기록 |
| 8 | 응답 | `POST` 결과 | `{metrics, servingLabels?}` 반영 결과 반환 |

**핵심:** P4는 새로운 기능을 만드는 게 아니라, P2(그리고 간접적으로 P3)의 **변경을 안전하게 승격시키는 게이트 시스템**이다.

---

## 세 레이어를 한 문장씩으로 다시 정리

- **P2**: 질문 → 근거 → 답변 (단발성, 검증된 완성 기능)
- **P3**: P2를 도구로 쓰는 에이전트들이 목표 하나를 순차/위임으로 협업 (일부 미완성 명시)
- **P4**: P2/P3의 변경사항이 안전한지 게이트로 검증하고 통과분만 서빙에 반영 (일부 미완성 명시)
